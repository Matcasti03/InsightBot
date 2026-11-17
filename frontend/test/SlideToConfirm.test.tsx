import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import SlideToConfirm from '../src/components/SlideToConfirm';
let container: HTMLDivElement;
let root: Root;
let track: HTMLDivElement;
let confirm: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container); confirm = vi.fn();
  await act(async () => root.render(<SlideToConfirm label="Deslize" onComplete={confirm} />));
  track = container.firstElementChild as HTMLDivElement;
  Object.defineProperty(track, 'clientWidth', { value: 300 });
  track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 56, right: 300, bottom: 56, x: 0, y: 0, toJSON: () => ({}) });
  track.setPointerCapture = vi.fn();
  track.releasePointerCapture = vi.fn();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function pointer(type: string, x: number) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientX: x, pointerId: 1, button: 0, isPrimary: true });
  await act(async () => track.dispatchEvent(event));
}
test('clicar no final da barra nao confirma a microcoleta', async () => {
  await pointer('pointerdown', 290); await pointer('pointerup', 290);
  expect(confirm).not.toHaveBeenCalled();
});
test('cancelar o gesto nunca confirma a microcoleta', async () => {
  await pointer('pointerdown', 25); await pointer('pointermove', 290); await pointer('pointercancel', 290);
  expect(confirm).not.toHaveBeenCalled();
});
test('deslizar do inicio ao fim confirma uma unica vez', async () => {
  await pointer('pointerdown', 25); await pointer('pointermove', 290); await pointer('pointerup', 290);
  await pointer('pointerdown', 25); await pointer('pointermove', 290); await pointer('pointerup', 290);
  expect(confirm).toHaveBeenCalledTimes(1);
});
