/**
 * 3D model island (GLB + VRM) — client:visible only, never statically imported.
 * Handles the constitution's three states: loading, error, empty.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

type ViewerStatus = 'loading' | 'ready' | 'error' | 'empty';

interface ModelViewerProps {
  url: string | null;
  kind: 'glb' | 'vrm';
}

const CAPTIONS: Record<ViewerStatus, string> = {
  loading: 'Summoning through the Veil…',
  ready: 'Drag disabled — the model rotates on its own.',
  error: 'The model could not cross the Veil (load error).',
  empty: 'No model available.',
};

export function ModelViewer({ url, kind }: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<ViewerStatus>(url ? 'loading' : 'empty');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!url || !canvas) return;

    // preserveDrawingBuffer keeps frames readable for the e2e pixel gate.
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
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
    if (kind === 'vrm') {
      loader.register((parser) => new VRMLoaderPlugin(parser));
    }
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
          // Frame arbitrary GLB content: center it and step back far enough.
          const box = new THREE.Box3().setFromObject(subject);
          const size = box.getSize(new THREE.Vector3()).length() || 1;
          const center = box.getCenter(new THREE.Vector3());
          subject.position.sub(center);
          camera.position.set(0, size * 0.2, size * 1.2);
          camera.lookAt(0, 0, 0);
        }
        scene.add(subject);
        setStatus('ready');
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
      () => setStatus('error'),
    );

    return () => {
      cancelAnimationFrame(frame);
      if (subject) scene.remove(subject);
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
    };
  }, [url, kind]);

  if (!url) {
    return <p data-viewer-status="empty">{CAPTIONS.empty}</p>;
  }

  return (
    <figure data-viewer-status={status} data-viewer-loaded={status === 'ready' ? 'true' : 'false'}>
      <canvas ref={canvasRef} width={480} height={480} aria-label="3D model preview" />
      <figcaption>{CAPTIONS[status]}</figcaption>
    </figure>
  );
}
