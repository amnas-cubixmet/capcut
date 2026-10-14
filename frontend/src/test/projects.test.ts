import { afterEach, expect, it } from 'vitest';
import { loadProjects, saveProjects } from '../services/projects';
afterEach(() => localStorage.clear());
it('reopens saved project metadata', () => {
  const projects = [{ id: 'one', name: 'My reel', aspect: '9:16' as const, updatedAt: 42 }];
  saveProjects(projects);
  expect(loadProjects()).toEqual(projects);
});
it('does not overwrite corrupt data', () => {
  localStorage.setItem('cutcraft-projects-v1', '[{"name":"broken"}]');
  expect(() => loadProjects()).toThrow('Saved projects are invalid');
  expect(localStorage.getItem('cutcraft-projects-v1')).toContain('broken');
});
