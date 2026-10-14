import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type Preferences = { reducedMotion: boolean; setReducedMotion: (value: boolean) => void };
export const usePreferences = create<Preferences>()(persist((set) => ({ reducedMotion: false, setReducedMotion: (reducedMotion) => set({ reducedMotion }) }), { name: 'cutcraft-preferences', version: 1 }));
