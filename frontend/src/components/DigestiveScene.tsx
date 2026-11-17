import { createMicroGripper, DEFAULT_GRIPPER, type GripperState } from '../lib/microGripper';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { advanceSimulation, createMucosaTextures, createTractGeometry, type DigestiveView, type SimulationMotion } from '../lib/digestiveSimulation';
import type { CapsulePosition } from '../types';

interface Props {
  view: DigestiveView;
  orientation: CapsulePosition;
  active: boolean;
  gripper?: GripperState;
  motion?: MutableRefObject<SimulationMotion>;
}

export default function DigestiveScene({ view, orientation, active, motion, gripper = DEFAULT_GRIPPER }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ orientation, active, gripper });
  controls.current = { orientation, active, gripper };
  const ownMotion = useRef<SimulationMotion>({ time: 0, distance: 0 });
  const clock = motion ?? ownMotion;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = view === 'endoscopic' ? 1.2 : 1.05;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const isCamera = view === 'endoscopic';
    scene.background = new THREE.Color(isCamera ? '#100403' : '#080f19');
    scene.fog = new THREE.Fog(isCamera ? '#180604' : '#080f19', isCamera ? 8 : 19, isCamera ? 38 : 46);
    const camera = new THREE.PerspectiveCamera(isCamera ? 88 : 48, 1, 0.08, 90);
    const tract = createTractGeometry(view);
    const textures = createMucosaTextures();
    const mucosa = new THREE.MeshPhysicalMaterial({
      map: textures.color, bumpMap: textures.bump, bumpScale: 0.065,
      roughness: 0.38, metalness: 0, clearcoat: 0.85,
      clearcoatRoughness: 0.19, side: THREE.DoubleSide,
      color: isCamera ? '#ffe1d6' : '#d6b3aa'
    });
    const wall = new THREE.Mesh(tract.geometry, mucosa);
    wall.frustumCulled = false;
    scene.add(wall);
    scene.add(new THREE.HemisphereLight('#ffe3d1', '#350e0b', isCamera ? 0.18 : 0.8));
    const lamp = new THREE.PointLight('#fff0dd', isCamera ? 38 : 55, 26, 2);
    scene.add(lamp);
    const fill = new THREE.PointLight('#ffcab3', isCamera ? 9 : 25, 18, 2);
    scene.add(fill);
    const capsule = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: '#dde5e9', metalness: 0.68, roughness: 0.26 });
    const ceramic = new THREE.MeshPhysicalMaterial({ color: '#f7f2e5', roughness: 0.22, clearcoat: 1 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#111c24', metalness: 0.25, roughness: 0.09, clearcoat: 1 });
    const led = new THREE.MeshBasicMaterial({ color: '#fff5dc' });
    if (!isCamera) {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.1, 12, 32), ceramic);
      body.rotation.x = Math.PI / 2;
      capsule.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.346, 0.346, 0.22, 48), metal);
      band.rotation.x = Math.PI / 2;
      capsule.add(band);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 20), glass);
      lens.scale.z = 0.42; lens.position.z = 0.86; capsule.add(lens);
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * Math.PI * 2;
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), led);
        light.position.set(Math.cos(angle) * 0.26, Math.sin(angle) * 0.26, 0.78);
        capsule.add(light);
      }
      capsule.position.z = 5;
      scene.add(capsule);
      const key = new THREE.DirectionalLight('#d7eaff', 2.4); key.position.set(5, 6, -2); scene.add(key);
      // A restrained centerline shows the capsule's route through the cutaway.
      const points = Array.from({ length: 80 }, (_, index) => new THREE.Vector3(0, 0, index / 79 * 24 - 2));
      const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: '#79d8dd', dashSize: 0.15, gapSize: 0.18, transparent: true, opacity: 0.5 }));
      route.computeLineDistances(); scene.add(route);
    }
    const tool = createMicroGripper();
    if (isCamera) {
      tool.root.position.set(0.55, -0.62, -0.45);
      tool.root.rotation.y = Math.PI;
      camera.add(tool.root);
      scene.add(camera);
    } else {
      tool.root.position.set(0.18, -0.18, 0.65);
      tool.root.scale.setScalar(0.48);
      capsule.add(tool.root);
    }
    let frame = 0;
    let previous = performance.now();
    let lastShape = -Infinity;
    let smoothedDepth = orientation.z ?? 0;
    const aim = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(Math.max((now - previous) / 1000, 0), 0.05); previous = now;
      if (document.hidden) return;
      const { orientation: target, active: moving, gripper: instrument } = controls.current;
      tool.update(isCamera ? { ...instrument, x: -instrument.x } : instrument);
      advanceSimulation(clock.current, delta, moving);
      const blend = 1 - Math.exp(-delta * 7);
      // Z is a manual offset; automatic forward movement stays continuous.
      smoothedDepth += ((target.z ?? 0) - smoothedDepth) * blend;
      const travel = clock.current.distance + smoothedDepth * 0.8;
      if (now - lastShape > 1000 / 24) {
        tract.update(travel, clock.current.time);
        textures.color.offset.y = textures.bump.offset.y = travel / 8;
        lastShape = now;
      }
      const sway = moving ? Math.sin(clock.current.time * 0.6) * 0.045 : 0;
      if (isCamera) {
        cameraPosition.set((target.x ?? 0) * 0.38 + sway, -(target.y ?? 0) * 0.3, 0);
        camera.position.lerp(cameraPosition, blend);
        aim.set((target.x ?? 0) * 1.7 + Math.sin(travel * 0.17 + 1) * 0.35, -(target.y ?? 0) * 1.25, 7);
        camera.up.set(Math.sin(THREE.MathUtils.degToRad(target.rotation ?? 0)), Math.cos(THREE.MathUtils.degToRad(target.rotation ?? 0)), 0);
        camera.lookAt(aim);
        lamp.position.copy(camera.position).add(new THREE.Vector3(0.12, 0.15, 0.6));
        fill.position.copy(camera.position).add(new THREE.Vector3(-0.2, -0.15, 0.2));
      } else {
        camera.position.set(7.4, 5.5, -7.5); camera.lookAt(0, 0, 6);
        capsule.position.x += ((target.x ?? 0) * 0.85 - capsule.position.x) * blend;
        capsule.position.y += (-(target.y ?? 0) * 0.65 + sway - capsule.position.y) * blend;
        capsule.rotation.set((target.y ?? 0) * 0.22, (target.x ?? 0) * 0.25, -THREE.MathUtils.degToRad(target.rotation ?? 0));
        lamp.position.copy(capsule.position).add(new THREE.Vector3(0, 0, 0.9));
        fill.position.set(1, 3, 3);
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>([metal, ceramic, glass, led, mucosa]);
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      textures.color.dispose(); textures.bump.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [view, clock]);

  return <div className="relative h-full w-full overflow-hidden bg-slate-950" role="img" aria-label={view === 'endoscopic' ? 'Simulacao de camera endoscopica dentro do trato digestivo' : 'Simulacao 3D em corte do trato digestivo com capsula'}>
    <div ref={containerRef} className="absolute inset-0" />
    {view === 'endoscopic' && <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 32%, rgba(12,2,1,.22) 65%, rgba(0,0,0,.9) 100%)', boxShadow: 'inset 0 0 55px 15px rgba(0,0,0,.45)' }} />}
    {failed && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-slate-300">Seu dispositivo nao disponibilizou WebGL. A telemetria e os controles continuam disponiveis.</div>}
  </div>;
}
