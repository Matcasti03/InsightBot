import { expect, test } from 'vitest';
import { advanceSimulation, createTractGeometry } from '../src/lib/digestiveSimulation';

test('avanco depende do tempo e pausa preserva a posicao', () => {
  const sixty = { time: 0, distance: 0 };
  const thirty = { time: 0, distance: 0 };
  for (let i = 0; i < 60; i++) advanceSimulation(sixty, 1 / 60, true);
  for (let i = 0; i < 30; i++) advanceSimulation(thirty, 1 / 30, true);
  expect(sixty.distance).toBeCloseTo(thirty.distance);
  const paused = { ...sixty };
  advanceSimulation(sixty, 1 / 30, false);
  expect(sixty).toEqual(paused);
  advanceSimulation(sixty, 300, true);
  expect(sixty.distance - paused.distance).toBeLessThan(0.05);
});

test.each(['endoscopic', 'mapping'] as const)('tunel %s tem geometria valida durante o percurso', view => {
  const tract = createTractGeometry(view);
  try {
    for (const distance of [0, 5, 25, 100]) {
      tract.update(distance, distance / 0.85);
      for (const attribute of ['position', 'normal', 'uv']) {
        expect(Array.from(tract.geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
      }
      expect(tract.geometry.boundingSphere!.radius).toBeGreaterThan(3);
    }
    if (view === 'endoscopic') {
      const positions = tract.geometry.getAttribute('position');
      for (let axis = 0; axis < 3; axis++) {
        expect(positions.array[axis]).toBeCloseTo(positions.array[72 * 3 + axis], 4);
      }
    }
  } finally { tract.geometry.dispose(); }
});
