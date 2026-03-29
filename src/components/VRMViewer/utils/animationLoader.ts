import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import type { VRM } from '@pixiv/three-vrm';
import { mixamoVRMRigMap } from './mixamoRigMap';

// Fetches an animation file, using a local proxy on localhost to avoid CORS
async function fetchViaProxy(url: string): Promise<Blob> {
  if (window.location.hostname === 'localhost') {
    try {
      const proxyUrl = `/api/proxy-asset?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
      }
      return response.blob();
    } catch (error) {
      console.error('Proxy fetch failed, falling back to direct fetch:', error);
    }
  }

  const response = await fetch(url, {
    mode: 'cors',
    credentials: 'omit',
    headers: { 'Accept': 'application/octet-stream,*/*' },
  });

  if (!response.ok) {
    throw new Error(`Failed to load animation: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}

// Loads a Mixamo FBX animation and retargets it to the VRM humanoid skeleton.
// Returns a THREE.AnimationClip ready to use with an AnimationMixer.
export async function loadMixamoAnimation(url: string, vrm: VRM): Promise<THREE.AnimationClip> {
  const animBlob = await fetchViaProxy(url);
  const animUrl = URL.createObjectURL(animBlob);
  const loader = new FBXLoader();

  try {
    // FBXLoader uses callbacks — we wrap it in a Promise.
    // THREE.Group is the type FBXLoader resolves with.
    const asset = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(animUrl, resolve, undefined, reject);
    });

    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
    if (!clip) throw new Error('No Mixamo animation found in FBX file');

    const tracks: THREE.KeyframeTrack[] = [];

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();
    const _vec3 = new THREE.Vector3();

    const hipsNode = asset.getObjectByName('mixamorigHips');
    if (!hipsNode) throw new Error('No hips bone found in animation');

    const motionHipsHeight = hipsNode.position.y;
    const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips')?.getWorldPosition(_vec3).y;
    const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;

    if (typeof vrmHipsY !== 'number' || typeof vrmRootY !== 'number') {
      throw new Error('Could not determine VRM hips position');
    }

    const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
    const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

    clip.tracks.forEach((track) => {
      const trackSplitted = track.name.split('.');
      const mixamoRigName = trackSplitted[0];
      const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
      const vrmNode = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName);
      const vrmNodeName = vrmNode?.name;
      const mixamoRigNode = asset.getObjectByName(mixamoRigName);

      if (vrmNodeName != null && mixamoRigNode != null) {
        const propertyName = trackSplitted[1];

        mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
        // parent! — non-null assertion: bones always have a parent in a valid FBX rig
        mixamoRigNode.parent!.getWorldQuaternion(parentRestWorldRotation);

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          for (let i = 0; i < track.values.length; i += 4) {
            const flatQuaternion = track.values.slice(i, i + 4);
            _quatA.fromArray(flatQuaternion);
            _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
            _quatA.toArray(flatQuaternion);
            flatQuaternion.forEach((v, index) => {
              track.values[index + i] = v;
            });
          }

          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v)),
            ),
          );
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          const value = track.values.map((v, i) =>
            (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
          );
          tracks.push(new THREE.VectorKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times,
            value,
          ));
        }
      }
    });

    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
  } finally {
    URL.revokeObjectURL(animUrl);
  }
}
