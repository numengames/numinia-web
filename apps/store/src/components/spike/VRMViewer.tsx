/**
 * Spike: VRM rendering inside a React island (client:visible).
 * Validates the MISSION-000 hypothesis that Astro islands can host
 * Three.js + @pixiv/three-vrm without configuration friction.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

type ViewerStatus = 'loading' | 'ready' | 'error' | 'empty';

interface VRMViewerProps {
  url: string | null;
}

export function VRMViewer({ url }: VRMViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<ViewerStatus>(url ? 'loading' : 'empty');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!url || !canvas) return;

    // preserveDrawingBuffer keeps the frame readable after present — the
    // DECISION GATE test verifies real pixels via readPixels.
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(480, 480);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 1.2, 2.4);

    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1, 1.5, 1).normalize();
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.6));

    let vrm: VRM | null = null;
    let frame = 0;
    const clock = new THREE.Clock();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        vrm = gltf.userData['vrm'] as VRM;
        VRMUtils.rotateVRM0(vrm);
        scene.add(vrm.scene);
        setStatus('ready');
        const animate = () => {
          frame = requestAnimationFrame(animate);
          const delta = clock.getDelta();
          vrm?.update(delta);
          if (vrm) vrm.scene.rotation.y += delta * 0.5;
          renderer.render(scene, camera);
        };
        animate();
      },
      undefined,
      () => setStatus('error'),
    );

    return () => {
      cancelAnimationFrame(frame);
      if (vrm) {
        scene.remove(vrm.scene);
        VRMUtils.deepDispose(vrm.scene);
      }
      renderer.dispose();
    };
  }, [url]);

  if (!url) {
    return <p data-vrm-status="empty">No VRM asset available in the catalog.</p>;
  }

  return (
    <figure data-vrm-status={status} data-vrm-loaded={status === 'ready' ? 'true' : 'false'}>
      <canvas ref={canvasRef} width={480} height={480} aria-label="VRM avatar preview" />
      <figcaption>
        {status === 'loading' && 'Summoning the avatar through the Veil…'}
        {status === 'ready' && 'Avatar rendered by @pixiv/three-vrm inside a React island.'}
        {status === 'error' && 'The avatar could not cross the Veil (load error).'}
      </figcaption>
    </figure>
  );
}
