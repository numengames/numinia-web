import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

// The shape of everything this hook returns.
// Documenting this type makes the hook self-describing — no need to read the implementation.
type UseVRMSetupReturn = {
  loadVRM: (url: string, scene: THREE.Scene) => Promise<VRM | null>;
  cleanupVRM: () => void;
  isLoading: boolean;
  error: string | null;
  currentVrm: VRM | null;
  mixer: THREE.AnimationMixer | null;
};

export function useVRMSetup(): UseVRMSetupReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  const loadVRM = useCallback(async (url: string, scene: THREE.Scene): Promise<VRM | null> => {
    if (!url || !scene) {
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Accept': 'application/octet-stream,*/*' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch VRM: ${response.status}`);
      }

      const modelBlob = await response.blob();
      const modelUrl = URL.createObjectURL(modelBlob);

      try {
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        // GLTFLoader.load returns its result via callback, not a Promise.
        // We wrap it in a Promise so we can use async/await.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(modelUrl, resolve, undefined, reject);
        });

        const vrm: VRM | undefined = gltf.userData.vrm;
        if (!vrm) throw new Error('No VRM data found in model');

        VRMUtils.rotateVRM0(vrm);

        const box = new THREE.Box3().setFromObject(vrm.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        vrm.scene.position.sub(center);
        vrm.scene.position.y = size.y * -0.2;
        vrm.scene.rotation.y = Math.PI;

        scene.add(vrm.scene);
        vrmRef.current = vrm;
        return vrm;
      } finally {
        URL.revokeObjectURL(modelUrl);
      }
    } catch (err) {
      // "unknown" is safer than "any" for catch blocks — forces you to check the type
      const message = err instanceof Error ? err.message : 'Unknown error loading VRM';
      console.error('VRM load error:', err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cleanupVRM = useCallback(() => {
    if (vrmRef.current) {
      const vrm = vrmRef.current;

      if (vrm.scene) {
        vrm.scene.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              (mesh.material as THREE.Material[]).forEach((m) => m.dispose());
            } else {
              (mesh.material as THREE.Material).dispose();
            }
          }
        });
      }

      // VRM v3 does not expose a dispose() method — geometry/material
      // cleanup above is sufficient.
      vrmRef.current = null;
    }

    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
  }, []);

  return {
    loadVRM,
    cleanupVRM,
    isLoading,
    error,
    currentVrm: vrmRef.current,
    mixer: mixerRef.current,
  };
}
