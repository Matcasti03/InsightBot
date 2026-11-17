import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
vi.mock('three', async importOriginal => ({
  ...await importOriginal<typeof import('three')>(),
  WebGLRenderer: class { constructor() { throw new Error('WebGL indisponivel'); } }
}));
import DigestiveScene from '../src/components/DigestiveScene';

test('dispositivo sem WebGL exibe mensagem em vez de interromper o console', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DigestiveScene view="endoscopic" orientation={{}} active />));
    expect(container.textContent).toContain('Seu dispositivo nao disponibilizou WebGL');
    expect(container.querySelector('canvas')).toBeNull();
  } finally { await act(async () => root.unmount()); container.remove(); }
});
