import { expect, test } from 'vitest';
import { Vector3, type Mesh, type Material } from 'three';
import { createMicroGripper, DEFAULT_GRIPPER } from '../src/lib/microGripper';

test('garra articula, avanca, abre e recolhe de acordo com os controles', () => {
  const tool = createMicroGripper();
  try {
    expect(tool.root.visible).toBe(false);
    tool.update({ ...DEFAULT_GRIPPER, enabled: true, extension: 0, opening: 0 });
    tool.root.updateMatrixWorld(true);
    const start = tool.wrist.getWorldPosition(new Vector3());
    expect(tool.jaws[0].rotation.y).toBe(0);
    tool.update({ enabled: true, x: 1, y: 1, extension: 1, rotation: 90, opening: 1 });
    tool.root.updateMatrixWorld(true);
    const end = tool.wrist.getWorldPosition(new Vector3());
    expect(end.x).toBeGreaterThan(start.x);
    expect(end.y).toBeGreaterThan(start.y);
    expect(end.z).toBeGreaterThan(start.z);
    expect(tool.jaws[0].rotation.y).toBeGreaterThan(0);
    expect(tool.jaws[1].rotation.y).toBeLessThan(0);
    tool.update({ ...DEFAULT_GRIPPER, enabled: false });
    expect(tool.root.visible).toBe(false);
  } finally {
    const materials = new Set<Material>();
    tool.root.traverse(object => {
      const mesh = object as Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
    });
    materials.forEach(material => material.dispose());
  }
});
