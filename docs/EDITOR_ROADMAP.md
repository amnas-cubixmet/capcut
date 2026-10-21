# CutCraft Studio — Full Editor Roadmap

CutCraft is an original CapCut-inspired editor, not a redistribution of CapCut code, assets, logos or proprietary AI models.

## What exists on feat/frontend-editor
- React dashboard and local project CRUD.
- IndexedDB media import, browser-based preview, visual/audio/text timeline lanes.
- Basic trim, split, duplicate, delete, visual reordering, timeline scrub/zoom, play/pause, undo/redo.
- Auto-persisted edit decisions and JSON edit-decision download. JSON is **not** a full media backup.
- FastAPI health/capabilities/metadata probing. Rendering and AI endpoints are **not** complete.

## P0 — Reliability and testable editing foundations
- [ ] Run `npm ci && npm run lint && npm test && npm run build` in frontend.
- [ ] Fix any issues found on Chrome, Edge, Firefox and Safari.
- [ ] Add Vitest component tests for media import, split, trim, undo/redo, keyboard shortcuts, navigation and storage failures.
- [ ] Validate project JSON with schema/version migrations; never silently overwrite an invalid draft.
- [ ] Add portable project backup format with original media bundle and restore process.
- [ ] Add reference counting for media shared between duplicated projects.
- [ ] Prevent media races, playback drift and object-URL leaks in longer sessions.
- [ ] Add clear browser quota errors, supported codecs listing, and media relink UI.

## P1 — Production nonlinear timeline
- [ ] Normalize a separate timeline engine and clip model independent of React.
- [ ] Drag and drop clips between tracks; clip trim handles and slip/slide edits.
- [ ] Snap, magnetic placement, ripple editing, group/ungroup, lock/mute/hide, multi-select.
- [ ] Unlimited video/audio/overlay tracks with predictable layering and blending.
- [ ] Playback scheduler and compositor (Canvas/WebGL or suitable media engine).
- [ ] Canvas transformations: crop, scale, rotation, position, opacity, masks, blend modes.
- [ ] Text editor: font, style, outline, shadow, alignment, auto wrap and animated titles.
- [ ] Transitions with handles and overlap-safe duration calculations.
- [ ] Keyframe curves with linear/ease interpolation and copy/paste.
- [ ] Waveform and thumbnail generation in web workers; background proxy previews.
- [ ] Timeline navigation optimized for 500+ clips.

## P2 — Effects and audio
- [ ] Color: exposure, contrast, saturation, temperature, curves, LUTs and presets.
- [ ] Effects: blur, sharpen, glow, vignette, chroma key, masks and compositing.
- [ ] Speed change and speed ramps, reverse, freeze frame, stabilization integration.
- [ ] Audio mixer: volume automation, fades, ducking, noise reduction and multi-track monitoring.
- [ ] Voiceover recording, audio waveform editing and sample-accurate synchronization.
- [ ] Captions timeline, subtitle import/export (.srt/.vtt), branded subtitle templates.
- [ ] Effect preview matches final rendered output (golden render tests).

## P3 — Reliable video export
- [ ] Local FFmpeg export using a safe, user-approved local staging workflow.
- [ ] MP4 (H.264/AAC) with 720p, 1080p and optional 4K; aspect ratio and FPS presets.
- [ ] Render graph faithfully applies cuts, speed, text, transitions, effects and audio mix.
- [ ] Progress indicators, cancel/retry, temporary-file cleanup, disk quota checks.
- [ ] Audio sync, duration and frame-count validation with ffprobe.
- [ ] Cross-platform Windows/macOS/Linux packaging; explicit FFmpeg licensing review.

## P4 — Opt-in local AI features
- [ ] Local speech-to-text auto captions with language choices, including Malayalam.
- [ ] Optional offline text-to-speech with licensed local voice models.
- [ ] Background removal/chroma key with clear supported GPU/CPU modes.
- [ ] Silence removal, scene detection, beat detection and optional auto-edit suggestions.
- [ ] Keep imported media local by default; explain before any cloud service is used.
- [ ] Model download size, hardware requirements and privacy clearly visible.

## P5 — Production release criteria
- [ ] Keyboard accessibility, focus visibility, reduced-motion support, responsive layouts.
- [ ] Autosave recovery after browser kill, project migration, backup and restore.
- [ ] Stress tests: 1-hour footage, 100+ assets, missing media, corrupt media and quota exhaustion.
- [ ] Browser end-to-end tests for import -> edit -> preview -> MP4 export -> reopen.
- [ ] Performance profiling; no frozen UI during thumbnail, waveform or export operations.
- [ ] Application is considered a feature-rich editor only after P0-P3 pass acceptance tests.

## Design principles
1. Never show a visual control that claims to work unless it is wired to a real editing operation.
2. Save original media unchanged; all edits should be nondestructive decisions.
3. Preserve browser-local media by default; exporting projects must explicitly address original files.
4. Rendering and preview must share the same timebase and transformation definitions.
5. Implement small vertically complete features, tests first for editing math, then UI.
