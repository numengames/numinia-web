import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { VRM } from '@pixiv/three-vrm';

// "type" imports: we only need these for the compiler, not at runtime.
// They get stripped from the final JS bundle — zero cost.

export function useAnimationLoop(
  isInitialized: boolean,
  vrm: VRM | null,
  mixer: THREE.AnimationMixer | null,
  renderer: THREE.WebGLRenderer | null,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  controls: OrbitControls | null,
): void {
  const clockRef = useRef(new THREE.Clock());
  // number | undefined: the ID returned by requestAnimationFrame
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isInitialized || !renderer || !scene || !camera) return;

    const animate = () => {
      const delta = clockRef.current.getDelta();

      if (controls) {
        controls.update();
      }

      if (mixer) {
        mixer.update(delta);
      }

      if (vrm) {
        vrm.update(delta);
      }

      renderer.render(scene, camera);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, vrm, mixer, renderer, scene, camera, controls]);
}
