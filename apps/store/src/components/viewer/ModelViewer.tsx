/**
 * 3D model island (GLB + VRM) — client:visible only, never statically imported.
 * Handles the constitution's three states: loading, error, empty.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { viewerProxyUrl } from '../../lib/media-proxy';
import { LunaEspera } from '../chrome/LunaEspera';

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
    // Hemisphere fill keeps metallic materials from going dead flat.
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x2a2420, 0.8);
    scene.add(light, hemi, new THREE.AmbientLight(0xffffff, 0.6));

    let vrm: VRM | null = null;
    let subject: THREE.Object3D | null = null;
    let frame = 0;
    const clock = new THREE.Clock();

    /* Chain hosts send no CORS (R2), so EVERY request — the model and any
       external resource it references — rides our own origin. The manager
       resolves relative resource paths against the ORIGINAL url first, so
       a sidecar texture next to the model keeps working. blob:/data: pass
       through untouched (embedded textures). */
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((requested) => {
      if (requested.startsWith('blob:') || requested.startsWith('data:')) return requested;
      try {
        const absolute = new URL(requested, url).href;
        return viewerProxyUrl(absolute) ?? requested;
      } catch {
        return requested;
      }
    });
    const loader = new GLTFLoader(manager);
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
          // Frame the avatar by its REAL bounds — a fixed camera cut tall
          // models and drowned short ones. Feet stay down: only x/z center.
          const box = new THREE.Box3().setFromObject(subject);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          subject.position.x -= center.x;
          subject.position.z -= center.z;
          subject.position.y -= box.min.y;
          const height = size.y || 1.5;
          camera.position.set(0, height * 0.55, height * 1.7);
          camera.lookAt(0, height * 0.5, 0);
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
      <canvas
        ref={canvasRef}
        width={480}
        height={480}
        // The GL buffer stays 480²; CSS scales it into narrow viewports —
        // a canvas wider than the phone was the top responsive offender.
        style={{ maxWidth: '100%', height: 'auto' }}
        aria-label="3D model preview"
      />
      <figcaption>
        {status === 'loading' && <LunaEspera />} {CAPTIONS[status]}
      </figcaption>
    </figure>
  );
}
