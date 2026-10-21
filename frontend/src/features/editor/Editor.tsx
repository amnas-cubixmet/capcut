import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Copy, Download, Film, Image as ImageIcon, Music2,
  Pause, Play, Plus, Scissors, Trash2, Type, Undo2, Redo2, Upload,
  Volume2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { identifyKind, inspectDuration, readMedia, removeMedia, saveMedia, type MediaAsset } from './localMedia';
import { loadProjects } from '../../services/projects';
import './editor.css';

type ClipKind = MediaAsset['kind'] | 'text';
type Clip = {
  id: string;
  kind: ClipKind;
  assetId?: string;
  position: number;
  start: number;
  end: number;
  text?: string;
  volume: number;
};
type DocumentData = { media: MediaAsset[]; clips: Clip[] };
const emptyDocument: DocumentData = { media: [], clips: [] };
const durationOf = (clip: Clip) => Math.max(0, clip.end - clip.start);
const endOf = (clip: Clip) => clip.position + durationOf(clip);
const visual = (clip: Clip) => clip.kind === 'video' || clip.kind === 'image';
const projectKey = (id: string) => 'cutcraft-edit-v1-' + id;
const formatTime = (time: number) => {
  const value = Math.max(0, Number.isFinite(time) ? time : 0);
  return Math.floor(value / 60).toString().padStart(2, '0') + ':' +
    Math.floor(value % 60).toString().padStart(2, '0');
};
function loadDocument(id: string): DocumentData {
  try {
    const raw = localStorage.getItem(projectKey(id));
    if (!raw) return emptyDocument;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('media' in data) || !('clips' in data)) return emptyDocument;
    const value = data as DocumentData;
    return Array.isArray(value.media) && Array.isArray(value.clips) ? value : emptyDocument;
  } catch {
    return emptyDocument;
  }
}
function compactVisuals(clips: Clip[]): Clip[] {
  const ordered = clips.filter(visual).sort((a, b) => a.position - b.position);
  let cursor = 0;
  const positions = new Map<string, number>();
  for (const clip of ordered) {
    positions.set(clip.id, cursor);
    cursor += durationOf(clip);
  }
  return clips.map((clip) => visual(clip) ? { ...clip, position: positions.get(clip.id) ?? 0 } : clip);
}
function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function FileIcon({ kind }: { kind: ClipKind }) {
  if (kind === 'audio') return <Music2 size={16} />;
  if (kind === 'image') return <ImageIcon size={16} />;
  if (kind === 'text') return <Type size={16} />;
  return <Film size={16} />;
}

export function Editor() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [documentData, setDocumentData] = useState<DocumentData>(() => loadDocument(projectId));
  const docRef = useRef(documentData);
  const undoStack = useRef<DocumentData[]>([]);
  const redoStack = useRef<DocumentData[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const playheadRef = useRef(0);

  const project = useMemo(() => {
    try { return loadProjects().find((item) => item.id === projectId); }
    catch { return undefined; }
  }, [projectId]);
  const ratio = project?.aspect ?? '16:9';
  const clips = documentData.clips;
  const totalDuration = Math.max(0, ...clips.map(endOf));
  const selectedClip = clips.find((clip) => clip.id === selected);
  const activeVisual = clips.find((clip) => visual(clip) && playhead >= clip.position && playhead < endOf(clip));
  const activeAudio = clips.find((clip) => clip.kind === 'audio' && playhead >= clip.position && playhead < endOf(clip));
  const activeText = clips.filter((clip) => clip.kind === 'text' && playhead >= clip.position && playhead < endOf(clip));
  const videoAsset = documentData.media.find((asset) => asset.id === activeVisual?.assetId);
  const selectedAsset = documentData.media.find((asset) => asset.id === selectedClip?.assetId);
  const scale = 32 * zoom;

  useEffect(() => {
    const loaded = loadDocument(projectId);
    docRef.current = loaded;
    setDocumentData(loaded);
    undoStack.current = [];
    redoStack.current = [];
    setHistoryVersion((value) => value + 1);
    setSelected(null);
    setPlayhead(0);
    setPlaying(false);
    setError('');
  }, [projectId]);

  const assets = documentData.media;
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    async function hydrate() {
      const loaded: Record<string, string> = {};
      const unavailable: string[] = [];
      for (const item of assets) {
        try {
          const blob = await readMedia(item.id);
          if (!blob) { unavailable.push(item.name); continue; }
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          loaded[item.id] = url;
        } catch { unavailable.push(item.name); }
      }
      if (!cancelled) {
        setUrls(loaded);
        if (unavailable.length) setError('Media unavailable in this browser: ' + unavailable.join(', '));
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [assets]);

  function commit(next: DocumentData) {
    undoStack.current.push(docRef.current);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
    docRef.current = next;
    setDocumentData(next);
    setHistoryVersion((value) => value + 1);
    try { localStorage.setItem(projectKey(projectId), JSON.stringify(next)); setError(''); }
    catch { setError('Project changes were not saved. Check browser storage.'); }
  }
  function restore(next: DocumentData) {
    docRef.current = next;
    setDocumentData(next);
    setHistoryVersion((value) => value + 1);
    try { localStorage.setItem(projectKey(projectId), JSON.stringify(next)); setError(''); }
    catch { setError('Could not save the restored edit.'); }
  }
  function undo() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(docRef.current);
    restore(previous);
  }
  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(docRef.current);
    restore(next);
  }
  function seek(raw: number) {
    const time = Math.min(Math.max(0, raw), totalDuration);
    setPlayhead(time);
    playheadRef.current = time;
    const clip = docRef.current.clips.find((item) => visual(item) && time >= item.position && time < endOf(item));
    if (clip?.kind === 'video' && videoRef.current && clip.id === activeVisual?.id) {
      const sourceTime = clip.start + (time - clip.position);
      if (Math.abs(videoRef.current.currentTime - sourceTime) > 0.08) videoRef.current.currentTime = sourceTime;
    }
    const audio = docRef.current.clips.find((item) => item.kind === 'audio' && time >= item.position && time < endOf(item));
    if (audio && audioRef.current && audio.id === activeAudio?.id) {
      const sourceTime = audio.start + time - audio.position;
      if (Math.abs(audioRef.current.currentTime - sourceTime) > 0.2) audioRef.current.currentTime = sourceTime;
    }
  }
  function updateClip(patch: Partial<Clip>) {
    if (!selectedClip) return;
    const asset = documentData.media.find((item) => item.id === selectedClip.assetId);
    const candidate = { ...selectedClip, ...patch };
    const max = asset?.duration ?? 3600;
    candidate.start = Math.min(Math.max(0, candidate.start), max - 0.05);
    candidate.end = Math.min(Math.max(candidate.start + 0.05, candidate.end), max);
    candidate.position = Math.max(0, candidate.position);
    commit({ ...documentData, clips: compactVisuals(clips.map((item) => item.id === selectedClip.id ? candidate : item)) });
  }
  function addClip(item: MediaAsset) {
    const last = Math.max(0, ...docRef.current.clips.filter(visual).map(endOf));
    const clip: Clip = {
      id: crypto.randomUUID(), kind: item.kind, assetId: item.id,
      position: item.kind === 'audio' ? playheadRef.current : last,
      start: 0, end: item.duration, volume: 1,
    };
    commit({ ...docRef.current, clips: [...docRef.current.clips, clip] });
    setSelected(clip.id);
    setNotice(item.name + ' added to timeline.');
  }
  async function importFiles(list: FileList | File[]) {
    if (!list.length) return;
    setBusy(true);
    setNotice('');
    let imported = 0;
    try {
      for (const file of Array.from(list)) {
        const kind = identifyKind(file);
        if (!kind) { setError('Unsupported file: ' + file.name); continue; }
        try {
          const duration = await inspectDuration(file, kind);
          const asset: MediaAsset = {
            id: crypto.randomUUID(), name: file.name, kind, duration,
            size: file.size, mime: file.type,
          };
          await saveMedia(asset.id, file);
          commit({ ...docRef.current, media: [...docRef.current.media, asset] });
          imported += 1;
        } catch (failure) {
          setError(file.name + ': ' + (failure instanceof Error ? failure.message : 'Import failed.'));
        }
      }
      if (imported) setNotice(imported + ' file(s) saved locally. Click + to add to timeline.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }
  function addText() {
    const textClip: Clip = {
      id: crypto.randomUUID(), kind: 'text', position: playheadRef.current,
      start: 0, end: 3, text: 'Your title', volume: 1,
    };
    commit({ ...docRef.current, clips: [...docRef.current.clips, textClip] });
    setSelected(textClip.id);
  }
  function splitAtPlayhead() {
    const time = playheadRef.current;
    const target = (selectedClip && selectedClip.kind !== 'text' && time > selectedClip.position + 0.05 && time < endOf(selectedClip) - 0.05)
      ? selectedClip
      : clips.find((clip) => clip.kind !== 'text' && time > clip.position + 0.05 && time < endOf(clip) - 0.05);
    if (!target) { setNotice('Place the playhead inside a video, audio or image clip to split.'); return; }
    const midpoint = target.start + time - target.position;
    const first: Clip = { ...target, end: midpoint };
    const second: Clip = { ...target, id: crypto.randomUUID(), start: midpoint, position: time };
    commit({ ...documentData, clips: clips.flatMap((clip) => clip.id === target.id ? [first, second] : [clip]) });
    setSelected(second.id);
    setNotice('Clip split at ' + formatTime(time));
  }
  function duplicateSelected() {
    if (!selectedClip) return;
    const clone: Clip = {
      ...selectedClip, id: crypto.randomUUID(),
      position: endOf(selectedClip) + (visual(selectedClip) ? 0.0001 : 0),
    };
    commit({ ...documentData, clips: compactVisuals([...clips, clone]) });
    setSelected(clone.id);
  }
  function deleteSelected() {
    if (!selectedClip) return;
    commit({ ...documentData, clips: compactVisuals(clips.filter((clip) => clip.id !== selectedClip.id)) });
    setSelected(null);
    seek(0);
  }
  function reorderVisual(direction: -1 | 1) {
    if (!selectedClip || !visual(selectedClip)) return;
    const ordered = clips.filter(visual).sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((item) => item.id === selectedClip.id);
    const other = index + direction;
    if (other < 0 || other >= ordered.length) return;
    [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
    let position = 0;
    const byId = new Map<string, number>();
    for (const item of ordered) { byId.set(item.id, position); position += durationOf(item); }
    commit({ ...documentData, clips: clips.map((item) => visual(item) ? { ...item, position: byId.get(item.id) ?? 0 } : item) });
    seek(0);
  }

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !activeVisual || activeVisual.kind !== 'video' || !urls[activeVisual.assetId ?? '']) return;
    const expected = activeVisual.start + playheadRef.current - activeVisual.position;
    if (Number.isFinite(expected) && expected >= 0 &&
      Math.abs(element.currentTime - expected) > 0.12) element.currentTime = expected;
    if (playing) void element.play().catch(() => setPlaying(false));
    else element.pause();
  }, [activeVisual, urls, playing]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !activeAudio || !urls[activeAudio.assetId ?? '']) return;
    const expected = activeAudio.start + playheadRef.current - activeAudio.position;
    if (Number.isFinite(expected) && expected >= 0 && Math.abs(element.currentTime - expected) > 0.15) {
      element.currentTime = expected;
    }
    element.volume = activeAudio.volume;
    if (playing) void element.play().catch(() => undefined);
    else element.pause();
  }, [activeAudio, urls, playing]);

  useEffect(() => {
    if (!playing || (activeVisual && activeVisual.kind !== 'image') || totalDuration <= 0) return;
    let frame = 0;
    let last = performance.now();
    function tick(now: number) {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const limit = activeVisual ? endOf(activeVisual) : totalDuration;
      const next = Math.min(limit, playheadRef.current + delta);
      playheadRef.current = next;
      setPlayhead(next);
      if (next < limit) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, activeVisual, totalDuration]);

  useEffect(() => {
    if (playing && playhead >= totalDuration && totalDuration > 0) setPlaying(false);
  }, [playhead, totalDuration, playing]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable=true]')) return;
      if (event.code === 'Space') { event.preventDefault(); setPlaying((wasPlaying) => !wasPlaying); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey) splitAtPlayhead();
      if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected();
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  const toolbar = <div className="editor-controls">
    <button onClick={() => { seek(0); setPlaying(false); }} title="Go to start">00:00</button>
    <button onClick={() => setPlaying((current) => !current)} aria-label={playing ? 'Pause' : 'Play'} disabled={!totalDuration}>
      {playing ? <Pause size={18} /> : <Play size={18} />}
    </button>
    <span className="editor-time">{formatTime(playhead)} / {formatTime(totalDuration)}</span>
  </div>;
  const track = (label: string, kinds: ClipKind[], trackClass: string) => (
    <div className="editor-track-row">
      <div className="editor-track-name">{label}</div>
      <div className="editor-track-lane" style={{ width: Math.max(760, totalDuration * scale + 80) }}>
        {clips.filter((clip) => kinds.includes(clip.kind)).map((clip) => (
          <button
            key={clip.id}
            type="button"
            className={'editor-clip ' + trackClass + (clip.id === selected ? ' selected' : '')}
            style={{ left: clip.position * scale, width: Math.max(24, durationOf(clip) * scale) }}
            onClick={() => { setSelected(clip.id); seek(clip.position); }}
            title={(documentData.media.find((item) => item.id === clip.assetId)?.name ?? clip.text ?? 'Clip') + ' · ' + durationOf(clip).toFixed(1) + 's'}
          >
            <FileIcon kind={clip.kind} />
            <span>{documentData.media.find((item) => item.id === clip.assetId)?.name ?? clip.text ?? 'Title'}</span>
          </button>
        ))}
      </div>
    </div>
  );
  if (!project) {
    return <main className="editor-missing"><h1>Project not found</h1><p>Create or open a project from the dashboard.</p><Link to="/projects">Go to projects</Link></main>;
  }
  return <div className="cutcraft-editor">
    <div className="editor-topbar">
      <Link to="/projects" aria-label="Back to projects"><ArrowLeft size={18} /></Link>
      <div><strong>{project.name}</strong><span> · {ratio} · Local draft</span></div>
      <div className="editor-toolbar-actions">
        <button onClick={undo} disabled={!undoStack.current.length} title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
        <button onClick={redo} disabled={!redoStack.current.length} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
        <button onClick={() => {
          downloadText(project.name.replace(/[^a-z0-9_-]+/gi, '-') + '.cutcraft.json', JSON.stringify({
            format: 'cutcraft-project-v1', name: project.name, ratio, ...docRef.current,
            note: 'Edit decisions only. Original media remains in this browser and is not included.',
          }, null, 2));
          setNotice('Edit decisions downloaded. This is not a video export and does not include media files.');
        }} title="Download edit decisions (JSON)"><Download size={16} /> Save edit JSON</button>
        <span className="editor-disabled-export" title="FFmpeg export pipeline is not implemented">MP4 export · Coming later</span>
      </div>
    </div>
    {(error || notice) && <div className="editor-status" role="status">{error && <span className="editor-error">{error}</span>}{notice && <span>{notice}</span>}</div>}
    <div className="editor-workspace">
      <aside className="editor-library">
        <h2><Upload size={18} /> Media library</h2>
        <p>Files stay on this device, in this browser.</p>
        <input ref={inputRef} id="cutcraft-import" type="file" accept="video/*,audio/*,image/*" multiple
          hidden onChange={(event) => { if (event.target.files) void importFiles(event.target.files); }} />
        <button className="editor-import" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Plus size={17} /> {busy ? 'Importing…' : 'Import media'}
        </button>
        <div className="editor-assets">
          {!assets.length && <p className="editor-empty">Import a video, image, or audio file to start editing.</p>}
          {assets.map((item) => <div className="editor-asset" key={item.id}>
            <FileIcon kind={item.kind} />
            <div><strong title={item.name}>{item.name}</strong><small>{item.kind} · {formatTime(item.duration)}</small></div>
            <button onClick={() => addClip(item)} title={'Add ' + item.name + ' to timeline'} aria-label={'Add ' + item.name + ' to timeline'}><Plus size={16} /></button>
            <button onClick={() => {
              if (clips.some((clip) => clip.assetId === item.id)) { setNotice('Remove clips that use this media before deleting it.'); return; }
              if (!window.confirm('Remove ' + item.name + ' from this project and browser storage?')) return;
              void removeMedia(item.id).then(() => commit({
                ...docRef.current, media: docRef.current.media.filter((asset) => asset.id !== item.id),
              })).catch(() => setError('Could not remove local file.'));
            }} title="Remove media" aria-label={'Remove ' + item.name}><Trash2 size={14} /></button>
          </div>)}
        </div>
        <button className="editor-text-action" onClick={addText}><Type size={17} /> Add text overlay</button>
      </aside>
      <section className="editor-preview-panel">
        <div className="editor-preview-heading"><span>PLAYER</span><span>{ratio}</span></div>
        <div className="editor-preview-stage">
          <div className="editor-preview" style={{ aspectRatio: ratio.replace(':', ' / ') }}>
            {!activeVisual && <div className="editor-preview-empty"><Film size={36} /><span>Import media and add it to the timeline</span></div>}
            {activeVisual?.kind === 'video' && <video key={activeVisual.id} ref={videoRef}
              playsInline preload="auto" src={urls[activeVisual.assetId ?? '']} onTimeUpdate={(event) => {
                if (!playing) return;
                const current = event.currentTarget.currentTime - activeVisual.start + activeVisual.position;
                if (current >= endOf(activeVisual) - 0.03) seek(endOf(activeVisual));
                else if (current >= activeVisual.position) seek(current);
              }} onEnded={() => seek(endOf(activeVisual))} />}
            {activeVisual?.kind === 'image' && <img src={urls[activeVisual.assetId ?? '']} alt={videoAsset?.name ?? 'Timeline image'} />}
            {activeText.map((clip) => <div key={clip.id} className="editor-preview-text">{clip.text}</div>)}
          </div>
        </div>
        <audio key={activeAudio?.id ?? 'none'} ref={audioRef} preload="auto" src={urls[activeAudio?.assetId ?? '']} />
        {toolbar}
        <input className="editor-seek" type="range" min={0} max={Math.max(totalDuration, 0.01)} step={0.01}
          aria-label="Seek timeline" value={Math.min(playhead, Math.max(totalDuration, 0.01))}
          onChange={(event) => seek(Number(event.target.value))} />
      </section>
      <aside className="editor-inspector">
        <h2>Inspector</h2>
        {!selectedClip && <p>Select a timeline clip to change its properties.</p>}
        {selectedClip && <>
          <div className="editor-inspector-title"><FileIcon kind={selectedClip.kind} />
            <strong>{selectedAsset?.name ?? 'Text overlay'}</strong></div>
          <label>Timeline position (seconds)<input type="number" min={0} step={0.1}
            disabled={visual(selectedClip)} value={Number(selectedClip.position.toFixed(2))}
            onChange={(event) => updateClip({ position: Number(event.target.value) })} /></label>
          <label>Trim start (seconds)<input type="number" min={0} max={selectedClip.end - 0.05} step={0.1}
            value={Number(selectedClip.start.toFixed(2))}
            onChange={(event) => updateClip({ start: Number(event.target.value) })} /></label>
          <label>Trim end (seconds)<input type="number" min={selectedClip.start + 0.05}
            max={selectedAsset?.duration ?? 3600} step={0.1} value={Number(selectedClip.end.toFixed(2))}
            onChange={(event) => updateClip({ end: Number(event.target.value) })} /></label>
          {selectedClip.kind === 'text' && <label>Caption text<textarea rows={4} value={selectedClip.text ?? ''}
            onChange={(event) => updateClip({ text: event.target.value.slice(0, 400) })} /></label>}
          {selectedClip.kind === 'audio' && <label><Volume2 size={15} /> Volume {Math.round(selectedClip.volume * 100)}%
            <input type="range" min={0} max={1} step={0.01} value={selectedClip.volume}
              onChange={(event) => updateClip({ volume: Number(event.target.value) })} /></label>}
          <div className="editor-inspector-buttons">
            <button onClick={splitAtPlayhead} disabled={selectedClip.kind === 'text'}><Scissors size={16} /> Split</button>
            <button onClick={duplicateSelected}><Copy size={16} /> Duplicate</button>
            <button onClick={deleteSelected}><Trash2 size={16} /> Delete</button>
          </div>
          {visual(selectedClip) && <div className="editor-inspector-buttons">
            <button onClick={() => reorderVisual(-1)}><ArrowLeft size={15} /> Move left</button>
            <button onClick={() => reorderVisual(1)}>Move right <ArrowRight size={15} /></button>
          </div>}
        </>}
      </aside>
    </div>
    <section className="editor-timeline-panel" aria-label="Timeline editor">
      <div className="editor-timeline-top">
        <div><strong>Timeline</strong><span>Space play/pause · S split · Del remove · Ctrl+Z undo</span></div>
        <div>
          <button onClick={splitAtPlayhead} title="Split video at playhead"><Scissors size={17} /></button>
          <button onClick={() => setZoom((value) => Math.max(0.5, value / 1.25))} aria-label="Zoom out"><ZoomOut size={17} /></button>
          <strong>{Math.round(zoom * 100)}%</strong>
          <button onClick={() => setZoom((value) => Math.min(4, value * 1.25))} aria-label="Zoom in"><ZoomIn size={17} /></button>
        </div>
      </div>
      <div className="editor-timeline-scroll">
        <div className="editor-ruler" style={{ width: Math.max(760, totalDuration * scale + 80) + 94 }}
          onClick={(event) => seek((event.clientX - event.currentTarget.getBoundingClientRect().left - 94) / scale)}>
          <span>TIME</span><div>{Array.from({ length: Math.min(500, Math.ceil(Math.max(30, totalDuration) / 5) + 1) },
            (_, index) => <span key={index} style={{ left: index * 5 * scale }}>{formatTime(index * 5)}</span>)}</div>
        </div>
        <div className="editor-timeline-inner" style={{ width: Math.max(760, totalDuration * scale + 80) + 94 }}>
          {track('VIDEO', ['video', 'image'], 'clip-video')}
          {track('TEXT', ['text'], 'clip-text')}
          {track('AUDIO', ['audio'], 'clip-audio')}
          <div className="editor-playhead" style={{ left: 94 + playhead * scale }} />
        </div>
      </div>
    </section>
    <p className="editor-footnote">Local editing preview is available. Multi-layer compositing, effects, transitions, AI tools and MP4 rendering require additional implementation. Edit JSON exports do not bundle media.</p>
    <span hidden>{historyVersion}</span>
  </div>;
}
