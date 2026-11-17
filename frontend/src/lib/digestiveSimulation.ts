import * as THREE from 'three';

export interface SimulationMotion { time: number; distance: number }
export type DigestiveView = 'endoscopic' | 'mapping';

export function advanceSimulation(motion: SimulationMotion, seconds: number, active: boolean) {
  // Clamp long gaps after a hidden tab so resuming never causes a camera jump.
  const delta = Math.min(Math.max(seconds, 0), 0.05);
  if (active) {
    motion.time += delta;
    motion.distance += delta * 0.85;
  }
}

export function tractCenter(distance: number) {
  return new THREE.Vector2(
    Math.sin(distance * 0.17) * 0.65 + Math.sin(distance * 0.39) * 0.18,
    Math.cos(distance * 0.21) * 0.42
  );
}

export function createTractGeometry(view: DigestiveView) {
  const rings = view === 'endoscopic' ? 140 : 90;
  const sides = 72;
  const positions = new Float32Array((rings + 1) * (sides + 1) * 3);
  const uvs = new Float32Array((rings + 1) * (sides + 1) * 2);
  const indices: number[] = [];
  const startAngle = view === 'mapping' ? Math.PI * 0.55 : 0;
  const sweep = view === 'mapping' ? Math.PI * 1.52 : Math.PI * 2;
  const length = view === 'mapping' ? 36 : 58;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  for (let ring = 0; ring <= rings; ring++) {
    for (let side = 0; side <= sides; side++) {
      const vertex = ring * (sides + 1) + side;
      uvs[vertex * 2] = side / sides * sweep / (Math.PI * 2);
      uvs[vertex * 2 + 1] = ring / rings * length / 8;
      if (ring < rings && side < sides) {
        const a = vertex;
        const b = vertex + sides + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  geometry.setIndex(indices);
  function update(distance: number, time: number) {
    const origin = tractCenter(distance);
    for (let ring = 0; ring <= rings; ring++) {
      const z = ring / rings * length - 3;
      const sample = z + distance;
      const center = tractCenter(sample);
      const contraction = 0.12 * Math.sin(sample * 0.65 - time * 0.7);
      for (let side = 0; side <= sides; side++) {
        const theta = startAngle + side / sides * sweep;
        // Soft transverse folds, longitudinal rugae and gentle peristalsis.
        const fold = Math.pow((Math.sin(sample * 2.8 + Math.sin(theta * 3) * 0.38) + 1) / 2, 5);
        const radius = 2.7 - fold * 0.46 + contraction
          + Math.sin(theta * 7 + sample * 0.48) * 0.085
          + Math.sin(theta * 13 - sample * 0.85) * 0.035;
        const index = (ring * (sides + 1) + side) * 3;
        positions[index] = center.x - origin.x + Math.cos(theta) * radius;
        positions[index + 1] = center.y - origin.y + Math.sin(theta) * radius * 0.9;
        positions[index + 2] = z;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
  update(0, 0);
  return { geometry, update };
}

let cachedSurface: HTMLCanvasElement | null = null;
function texturePair(canvas: HTMLCanvasElement) {
  const color = new THREE.CanvasTexture(canvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = color.wrapT = THREE.RepeatWrapping;
  const bump = new THREE.CanvasTexture(canvas);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { color, bump };
}

export function createMucosaTextures() {
  if (cachedSurface) return texturePair(cachedSurface);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D indisponivel.');
  const image = context.createImageData(size, size);
  // Deterministic texture: no crawling random pixels between animation frames.
  for (let y = 0; y < size; y++) {
    const v = y / size * Math.PI * 2;
    for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2;
      const broad = Math.sin(u * 5 + Math.sin(v * 3)) * Math.cos(v * 7 + Math.sin(u * 2));
      const detail = Math.sin(u * 73 + Math.sin(v * 37) * 2) * Math.sin(v * 91 + Math.sin(u * 29));
      const pores = Math.sin(u * 157 + v * 131) * Math.cos(v * 163 - u * 149);
      const vessel = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(u * 8 + Math.sin(v * 4) + Math.sin(v * 11) * 0.18)) * 28), 2);
      const index = (y * size + x) * 4;
      image.data[index] = 179 + broad * 15 + detail * 7 + pores * 3 - vessel * 27;
      image.data[index + 1] = 88 + broad * 12 + detail * 5 + pores * 3 - vessel * 28;
      image.data[index + 2] = 79 + broad * 11 + detail * 4 + pores * 2 - vessel * 17;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  cachedSurface = canvas;
  return texturePair(canvas);
}
