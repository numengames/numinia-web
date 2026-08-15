/**
 * Inspector 3D stage — lazy-loaded (three.js stays out of the base chunk).
 * Loads a local object URL, reports graph statistics upward, renders a
 * slowly rotating preview. The file never leaves the browser.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import type { InspectorKind, ModelStats } from '../../lib/inspector';

interface InspectorStageProps {
  url: string;
  kind: InspectorKind;
  onStats: (stats: ModelStats) => void;
  onError: () => void;
}

function collectStats(root: THREE.Object3D, animations: number, vrm: VRM | null): ModelStats {
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    const geometry = object.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute('position');
    if (position) vertices += position.count;
    const index = geometry.getIndex();
    triangles += Math.floor((index ? index.count : (position?.count ?? 0)) / 3);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  const meta = vrm?.meta as { name?: string; authors?: readonly string[] } | undefined;
  return {
    meshes,
    vertices,
    triangles,
    materials: materials.size,
    textures: textures.size,
    animations,
    vrmName: meta?.name ?? null,
    vrmAuthors: meta?.authors?.length ? meta.authors.join(', ') : null,
  };
}

export function InspectorStage({ url, kind, onStats, onError }: InspectorStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(480, 480);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1, 1.5, 1).normalize();
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.6));

    let vrm: VRM | null = null;
    let subject: THREE.Object3D | null = null;
    let frame = 0;
    const clock = new THREE.Clock();

    const loader = new GLTFLoader();
    if (kind === 'vrm') loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        if (kind === 'vrm' && gltf.userData['vrm']) {
          vrm = gltf.userData['vrm'] as VRM;
          VRMUtils.rotateVRM0(vrm);
          subject = vrm.scene;
          camera.position.set(0, 1.2, 2.4);
        } else {
          subject = gltf.scene;
          const box = new THREE.Box3().setFromObject(subject);
          const size = box.getSize(new THREE.Vector3()).length() || 1;
          const center = box.getCenter(new THREE.Vector3());
          subject.position.sub(center);
          camera.position.set(0, size * 0.2, size * 1.2);
          camera.lookAt(0, 0, 0);
        }
        scene.add(subject);
        onStats(collectStats(subject, gltf.animations.length, vrm));
        const animate = () => {
          frame = requestAnimationFrame(animate);
          const delta = clock.getDelta();
          vrm?.update(delta);
          if (subject) subject.rotation.y += delta * 0.5;
          renderer.render(scene, camera);
        };
        animate();
      },
      undefined,
      () => onError(),
    );

    return () => {
      cancelAnimationFrame(frame);
      if (subject) scene.remove(subject);
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
    };
  }, [url, kind, onStats, onError]);

  return <canvas ref={canvasRef} width={480} height={480} aria-label="3D inspection preview" />;
}
