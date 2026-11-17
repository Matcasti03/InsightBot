import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../src/lib/api', () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { id: 'doctor', role: 'medico' } }) }));
vi.mock('../src/contexts/ToastContext', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('../src/components/CapsuleScene', () => ({ default: ({ gripper }: { gripper?: { enabled: boolean; opening: number } }) => <div data-testid="mapping" data-gripper={String(gripper?.enabled)} data-opening={gripper?.opening} /> }));
vi.mock('../src/components/SimulatedFeed', () => ({ default: ({ aiEnabled, gripper }: { aiEnabled: boolean; gripper?: { enabled: boolean; opening: number; x: number } }) => <div data-testid="camera-ai" data-gripper={String(gripper?.enabled)} data-opening={gripper?.opening} data-x={gripper?.x}>{aiEnabled ? 'overlay-on' : 'overlay-off'}</div> }));
vi.mock('../src/components/Joystick', () => ({ default: () => null }));
import ConsolePage from '../src/pages/ConsolePage';

test('trocar exame ignora amostras recebidas com atraso do exame anterior', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let oldSamples!: (value: unknown[]) => void;
  let newSamples!: (value: unknown[]) => void;
  const first = new Promise<unknown[]>(resolve => { oldSamples = resolve; });
  const second = new Promise<unknown[]>(resolve => { newSamples = resolve; });
  mocks.get.mockImplementation((path: string) => {
    if (path === '/exams?status=em_andamento') return Promise.resolve([
      { id: 'first', capsule_id: 'CAP-1', status: 'em_andamento', ai_findings: [] },
      { id: 'second', capsule_id: 'CAP-2', status: 'em_andamento', ai_findings: [] }
    ]);
    if (path === '/patients') return Promise.resolve([]);
    return path.includes('/first/') ? first : second;
  });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter><ConsolePage /></MemoryRouter>));
    const select = container.querySelector('select[aria-label="Selecionar exame ativo"]') as HTMLSelectElement;
    expect(select).not.toBeNull();
    await act(async () => { select.value = 'second'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => newSamples([{ id: 'new-sample', lab_code: 'CURRENT-SAMPLE', coordinates: {}, status: 'coletada', result: 'pendente', human_validated: true }]));
    await act(async () => oldSamples([{ id: 'old-sample', lab_code: 'STALE-SAMPLE', coordinates: {}, status: 'coletada', result: 'pendente', human_validated: true }]));
    expect(container.textContent).toContain('CURRENT-SAMPLE');
    expect(container.textContent).not.toContain('STALE-SAMPLE');
  } finally { await act(async () => root.unmount()); container.remove(); }
});


test('assistente de IA alterna repetidamente o painel e o overlay da camera', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.get.mockImplementation((path: string) => Promise.resolve(
    path === '/exams?status=em_andamento' ? [{
      id: 'exam-ai', capsule_id: 'CAP-AI', status: 'em_andamento',
      ai_findings: [{ id: 'finding-ai', label: 'Achado de teste', confidence: 80, status: 'pendente' }]
    }] : []
  ));
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter><ConsolePage /></MemoryRouter>));
    const toggle = container.querySelector('button[role="switch"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    for (const enabled of [false, true, false, true]) {
      await act(async () => toggle.click());
      expect(toggle.getAttribute('aria-checked')).toBe(String(enabled));
      expect(container.querySelector('[data-testid="camera-ai"]')?.textContent).toBe(enabled ? 'overlay-on' : 'overlay-off');
      expect(container.textContent?.includes('Achado de teste')).toBe(enabled);
      expect(container.textContent?.includes('IA desativada')).toBe(!enabled);
    }
  } finally { await act(async () => root.unmount()); container.remove(); }
});


test('garra aparece nas duas visoes e seus controles nao acionam coleta', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.post.mockClear();
  mocks.get.mockImplementation((path: string) => Promise.resolve(
    path === '/exams?status=em_andamento' ? [{ id: 'gripper-exam', capsule_id: 'CAP-GRIPPER', status: 'em_andamento', ai_findings: [] }] : []
  ));
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  const click = async (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent?.trim() === label);
    expect(button).toBeDefined();
    await act(async () => button!.click());
  };
  try {
    await act(async () => root.render(<MemoryRouter><ConsolePage /></MemoryRouter>));
    await click('Ativar garra');
    expect(container.querySelector('[data-testid="camera-ai"]')?.getAttribute('data-gripper')).toBe('true');
    const horizontal = container.querySelector('input[aria-label="Horizontal da garra"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(horizontal, '0.7');
      horizontal.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="camera-ai"]')?.getAttribute('data-x')).toBe('0.7');
    await click('Fechar garra');
    expect(container.querySelector('[data-testid="camera-ai"]')?.getAttribute('data-opening')).toBe('0');
    await click('Mapa 3D');
    expect(container.querySelector('[data-testid="mapping"]')?.getAttribute('data-gripper')).toBe('true');
    expect(container.querySelector('[data-testid="mapping"]')?.getAttribute('data-opening')).toBe('0');
    await click('Recolher garra');
    expect(container.querySelector('[data-testid="mapping"]')?.getAttribute('data-gripper')).toBe('false');
    expect(mocks.post).not.toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); container.remove(); }
});
