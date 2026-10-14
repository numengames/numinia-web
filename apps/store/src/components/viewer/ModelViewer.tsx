/**
 * 3D model island (GLB + VRM) — lazy only, never statically imported into a
 * page's own chunk. Every state says what is happening, in the page's
 * language: loading (with its share when the size is known), on show, an
 * animation's skeleton, nothing to draw, a load error, no WebGL. A model that
 * cannot be shown offers its file instead: never an empty box (v0.89.0).
 *
 * The camera frames the model's bounding sphere with clipping planes measured
 * from it (lib/viewer-frame.ts). The old fixed far plane of 100 units clipped
 * every scene wider than ~80 whole — portfolio, Symposyum Space, Nerdearla
 * loaded and showed nothing.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import type { ViewerMessages } from '../../i18n/viewer';
import { fill } from '../../lib/bazaar-view';
import { viewerProxyUrl } from '../../lib/media-proxy';
import { clipPlanes, frameSphere, loadedShare } from '../../lib/viewer-frame';
import { LunaEspera } from '../chrome/LunaEspera';

type ViewerStatus = 'loading' | 'ready' | 'skeleton' | 'nothing' | 'error' | 'no-webgl';

interface ModelViewerProps {
  url: string | null;
  kind: 'glb' | 'vrm';
  labels: ViewerMessages;
  /** The file's size as the catalogue states it: the loading share's whole when the response states none. */
  bytes?: number | null;
}

/** Vertical field of view; the canvas is square, so it is the horizontal one too. */
const FOV = 30;

const FIGURE: CSSProperties = { margin: 0, display: 'grid', gap: '0.5rem', width: '100%' };
// The GL buffer stays 480²; CSS scales it into narrow viewports — a canvas
// wider than the phone was the top responsive offender.
const STAGE: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 480,
  aspectRatio: '1 / 1',
  marginInline: 'auto',
};
const CANVAS: CSSProperties = { display: 'block', width: '100%', height: '100%' };
const GONE: CSSProperties = { display: 'none' };
const OVERLAY: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  margin: 0,
  padding: '1rem',
  textAlign: 'center',
  color: 'var(--texto-2)',
};
const CAPTION: CSSProperties = {
  margin: 0,
  color: 'var(--texto-2)',
  fontSize: '0.875rem',
  textAlign: 'center',
};

/** Free what a loaded scene holds on the GPU: geometries, materials, textures. */
function disposeTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials: THREE.Material[] = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const material of materials) {
      for (const value of Object.values(material as unknown as Record<string, unknown>)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

/** The bones a file carries (an emote: a skeleton and its animation, no body). */
function bonesOf(root: THREE.Object3D): THREE.Bone[] {
  const bones: THREE.Bone[] = [];
  root.traverse((node) => {
    if (node instanceof THREE.Bone) bones.push(node);
  });
  return bones;
}

export function ModelViewer({ url, kind, labels, bytes = null }: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const [share, setShare] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!url || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      // preserveDrawingBuffer keeps frames readable for the e2e pixel gate.
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setStatus('no-webgl');
      return;
    }
    // updateStyle=false: the CSS above owns the layout box.
    renderer.setSize(480, 480, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1, 1.5, 1).normalize();
    // Hemisphere fill keeps metallic materials from going dead flat.
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x2a2420, 0.8);
    scene.add(light, hemi, new THREE.AmbientLight(0xffffff, 0.6));
    // The model turns about its own centre: it sits, centred, in a pivot.
    const pivot = new THREE.Group();
    scene.add(pivot);

    let vrm: VRM | null = null;
    let subject: THREE.Object3D | null = null;
    let skeleton: THREE.SkeletonHelper | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let frame = 0;
    let disposed = false;
    const timer = new THREE.Timer();

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

    const show = (gltf: GLTF): void => {
      if (disposed) {
        disposeTree(gltf.scene);
        return;
      }
      const model = gltf.scene;
      if (kind === 'vrm' && gltf.userData['vrm']) {
        vrm = gltf.userData['vrm'] as VRM;
        VRMUtils.rotateVRM0(vrm);
      }
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      if (box.isEmpty()) {
        // No body to measure: an animation file. Its bones are what it holds.
        const bones = bonesOf(model);
        if (bones.length === 0) {
          disposeTree(model);
          setStatus('nothing');
          return;
        }
        for (const bone of bones) box.expandByPoint(bone.getWorldPosition(new THREE.Vector3()));
        skeleton = new THREE.SkeletonHelper(model);
        skeleton.setColors(new THREE.Color(0x018ea1), new THREE.Color(0xe8a33d));
      }
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      if (vrm !== null) {
        // Frame the avatar by its REAL bounds; feet stay down: only x/z centre.
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        model.position.x -= centre.x;
        model.position.y -= box.min.y;
        model.position.z -= centre.z;
        const height = size.y || 1.5;
        camera.position.set(0, height * 0.55, height * 1.7);
        camera.lookAt(0, height * 0.5, 0);
        const planes = clipPlanes(sphere.radius, camera.position.length());
        camera.near = planes.near;
        camera.far = planes.far;
      } else {
        // An animation moves its bones beyond the rest pose: a margin.
        const radius = sphere.radius * (skeleton === null ? 1 : 1.25);
        model.position.sub(sphere.center);
        const view = frameSphere(radius, FOV);
        camera.position.set(0, view.y, view.z);
        camera.lookAt(0, 0, 0);
        camera.near = view.near;
        camera.far = view.far;
      }
      camera.updateProjectionMatrix();
      pivot.add(model);
      subject = model;
      // The skeleton draws from the model's world matrix: a child of the scene.
      if (skeleton !== null) scene.add(skeleton);
      const clip = gltf.animations[0];
      if (clip !== undefined) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(clip).play();
      }
      setStatus(skeleton === null ? 'ready' : 'skeleton');
      const animate = (time: number): void => {
        frame = requestAnimationFrame(animate);
        timer.update(time);
        const delta = timer.getDelta();
        mixer?.update(delta);
        vrm?.update(delta);
        pivot.rotation.y += delta * 0.5;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(animate);
    };

    loader.load(
      url,
      show,
      (event) => {
        if (!disposed) setShare(loadedShare(event.loaded, event.total, bytes));
      },
      () => {
        if (!disposed) setStatus('error');
      },
    );

    return () => {
      disposed = true;
      // A model still on its way stops downloading (a 63 MB scene, left).
      manager.abort();
      cancelAnimationFrame(frame);
      mixer?.stopAllAction();
      skeleton?.dispose();
      if (vrm !== null) VRMUtils.deepDispose(vrm.scene);
      else if (subject !== null) disposeTree(subject);
      renderer.dispose();
      // The canvas is keyed by its url, so a lost context is never reused.
      renderer.forceContextLoss();
    };
  }, [url, kind, bytes]);

  if (!url) {
    return (
      <p data-viewer-status="empty" style={CAPTION}>
        {labels.empty}
      </p>
    );
  }

  const shown = status === 'ready' || status === 'skeleton';
  const failed = status === 'error' || status === 'nothing' || status === 'no-webgl';
  const failure =
    status === 'nothing' ? labels.nothing : status === 'no-webgl' ? labels.noWebgl : labels.error;

  return (
    <figure
      className="visor-3d"
      data-viewer-status={status}
      data-viewer-loaded={shown ? 'true' : 'false'}
      style={FIGURE}
    >
      <div style={STAGE}>
        <canvas
          key={url}
          ref={canvasRef}
          width={480}
          height={480}
          style={failed ? GONE : CANVAS}
          role="img"
          aria-label={labels.canvasLabel}
        />
        {status === 'loading' && (
          <p role="status" style={OVERLAY}>
            <LunaEspera />
            {share === null ? labels.loading : fill(labels.loadingShare, { percent: share })}
          </p>
        )}
        {failed && (
          <div data-viewer-failure style={OVERLAY}>
            <p style={{ margin: 0, color: 'var(--texto)' }}>{failure}</p>
            <a
              className="btn btn-fantasma"
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              data-metric="viewer-download"
              style={{ textDecoration: 'none' }}
            >
              {labels.downloadInstead}
            </a>
          </div>
        )}
      </div>
      {shown && (
        <figcaption style={CAPTION}>
          {status === 'skeleton' ? labels.skeleton : labels.ready}
        </figcaption>
      )}
    </figure>
  );
}
