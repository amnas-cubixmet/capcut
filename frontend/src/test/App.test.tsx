import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { usePreferences } from '../stores/preferences';
afterEach(() => { cleanup(); usePreferences.setState({ reducedMotion: false }); localStorage.clear(); });
it('opens and closes the accessible foundation dialog', () => { render(<MemoryRouter><App/></MemoryRouter>); fireEvent.click(screen.getByRole('button', { name: /Explore/ })); expect(screen.getByRole('dialog')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Close' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); });
it('persists accessibility preferences', () => { render(<MemoryRouter initialEntries={['/settings']}><App/></MemoryRouter>); fireEvent.click(screen.getByRole('checkbox')); expect(usePreferences.getState().reducedMotion).toBe(true); expect(JSON.parse(localStorage.getItem('cutcraft-preferences')!).state.reducedMotion).toBe(true); });
it('provides recovery for unknown routes', () => { render(<MemoryRouter initialEntries={['/missing']}><App/></MemoryRouter>); expect(screen.getByRole('link', { name: 'Back to workspace' })).toHaveAttribute('href', '/'); });
