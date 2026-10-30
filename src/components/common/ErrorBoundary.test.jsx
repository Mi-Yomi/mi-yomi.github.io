import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.jsx';
import { reloadForChunkError } from '../../lib/chunkRecovery.js';

vi.mock('../../lib/chunkRecovery.js', async importOriginal => ({
    ...await importOriginal(), reloadForChunkError: vi.fn(),
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('offers a document reload when React has cached a rejected lazy import', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('window', Object.create(window, { location: { value: { reload } } }));
    const error = new TypeError('error loading dynamically imported module: /assets/MangaReader-old.js');
    function FailedImport() { throw error; }
    render(<ErrorBoundary><FailedImport /></ErrorBoundary>);
    expect(reloadForChunkError).toHaveBeenCalledWith(error);
    expect(screen.queryByText(error.message)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Обновить страницу' }));
    expect(reload).toHaveBeenCalledTimes(1);
});
