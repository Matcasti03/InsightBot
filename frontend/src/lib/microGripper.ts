import * as THREE from 'three';

export interface GripperState {
  enabled: boolean;
  x: number;
  y: number;
  extension: number;
  rotation: number;
  opening: number;
}
export const DEFAULT_GRIPPER: GripperState = { enabled: false, x: 0, y: 0, extension: 0.35, rotation: 0, opening: 0.6 };

export function createMicroGripper() {
  const root = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#d9e2e8', metalness: 0.88, roughness: 0.19 });
  const sheath = new THREE.MeshStandardMaterial({ color: '#505b66', metalness: 0.5, roughness: 0.4 });
  const shaftGeometry = new THREE.CylinderGeometry(0.045, 0.055, 1, 16);
  const shafts = [new THREE.Mesh(shaftGeometry, sheath), new THREE.Mesh(shaftGeometry, steel)];
  root.add(...shafts);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), steel); root.add(joint);
  const wrist = new THREE.Group(); root.add(wrist);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 16), steel);
  hinge.rotation.z = Math.PI / 2; wrist.add(hinge);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.025, 0, 0), new THREE.Vector3(0.08, 0, 0.15),
    new THREE.Vector3(0.09, 0, 0.32), new THREE.Vector3(0.015, 0, 0.44)
  ]);
  const jawGeometry = new THREE.TubeGeometry(curve, 24, 0.025, 8, false);
  const jaws = [new THREE.Group(), new THREE.Group()];
  jaws.forEach((jaw, index) => {
    const finger = new THREE.Mesh(jawGeometry, steel); jaw.add(finger);
    if (index === 1) jaw.scale.x = -1;
    wrist.add(jaw);
  });
  const origin = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);
  const twist = new THREE.Quaternion();
  function segment(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
    direction.subVectors(to, from);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.scale.y = direction.length();
    mesh.quaternion.setFromUnitVectors(yAxis, direction.normalize());
  }
  function update(state: GripperState) {
    root.visible = state.enabled;
    const x = THREE.MathUtils.clamp(state.x, -1, 1);
    const y = THREE.MathUtils.clamp(state.y, -1, 1);
    const extension = THREE.MathUtils.clamp(state.extension, 0, 1);
    elbow.set(x * 0.2, y * 0.15, 0.7 + extension * 0.3);
    tip.set(x * 0.9, 0.25 + y * 0.7, 1.5 + extension * 1.7);
    segment(shafts[0], origin, elbow); segment(shafts[1], elbow, tip);
    joint.position.copy(elbow); wrist.position.copy(tip);
    direction.subVectors(tip, elbow).normalize();
    wrist.quaternion.setFromUnitVectors(zAxis, direction);
    twist.setFromAxisAngle(zAxis, THREE.MathUtils.degToRad(state.rotation));
    wrist.quaternion.multiply(twist);
    const opening = THREE.MathUtils.clamp(state.opening, 0, 1) * 0.65;
    jaws[0].rotation.y = opening; jaws[1].rotation.y = -opening;
  }
  update(DEFAULT_GRIPPER);
  return { root, update, wrist, jaws };
}
