import { afterEach, expect, it, vi } from 'vitest';
import { getCapabilities } from '../services/backend';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('rejects an unconfigured backend', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '');
  await expect(getCapabilities(new AbortController().signal)).rejects.toThrow('Set VITE_API_BASE_URL');
});
it('rejects malformed capabilities instead of enabling AI', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ captions: 'yes' }) }));
  await expect(getCapabilities(new AbortController().signal)).rejects.toThrow('Invalid backend capabilities');
});
it('reports HTTP failure', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  await expect(getCapabilities(new AbortController().signal)).rejects.toThrow('503');
});
