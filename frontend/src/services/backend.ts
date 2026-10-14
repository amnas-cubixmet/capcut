export type Capabilities = {
  media_probe: boolean;
  ffmpeg_installed: boolean;
  auto_edit: boolean;
  captions: boolean;
  noise_reduction: boolean;
  render: boolean;
  reason: string;
};
export async function getCapabilities(signal: AbortSignal): Promise<Capabilities> {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!base) throw new Error('Set VITE_API_BASE_URL to connect a backend.');
  const response = await fetch(`${base.replace(/\/$/, '')}/api/v1/capabilities`, { signal });
  if (!response.ok) throw new Error(`Backend request failed (${response.status}).`);
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null) throw new Error('Invalid backend response.');
  const record = data as Record<string, unknown>;
  for (const key of ['media_probe', 'ffmpeg_installed', 'auto_edit', 'captions', 'noise_reduction', 'render']) {
    if (typeof record[key] !== 'boolean') throw new Error('Invalid backend capabilities.');
  }
  if (typeof record.reason !== 'string') throw new Error('Invalid backend capabilities.');
  return data as Capabilities;
}
