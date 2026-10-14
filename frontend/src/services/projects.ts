export const presets = ['9:16', '16:9', '1:1', '4:5'] as const;
export type Project = { id: string; name: string; aspect: typeof presets[number]; updatedAt: number };
const key = 'cutcraft-projects-v1';
export function loadProjects(): Project[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every((p: unknown) => {
    if (typeof p !== 'object' || p === null) return false;
    const value = p as Record<string, unknown>;
    return typeof value.id === 'string' && typeof value.name === 'string' && typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && presets.includes(value.aspect as Project['aspect']);
  })) throw new Error('Saved projects are invalid. Restore a backup or clear this site’s storage.');
  return data as Project[];
}
export function saveProjects(projects: Project[]): void { localStorage.setItem(key, JSON.stringify(projects)); }
