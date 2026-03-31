/**
 * Auto-generates thumbnails for all supported asset types.
 * - VRM/GLB/GLTF: Three.js offscreen render
 * - STL: Three.js STLLoader render
 * - HYP: extract GLB from .hyp binary, then render
 * - JPG/PNG/WebP: resize the image itself
 * - Audio/Video: no auto-thumbnail (returns null)
 */

export async function generateThumbnail(modelUrl: string): Promise<string | null> {
  const ext = modelUrl.split('.').pop()?.toLowerCase() || '';

  if (['vrm', 'glb', 'gltf'].includes(ext)) return generate3DThumbnail(modelUrl);
  if (ext === 'stl') return generateSTLThumbnail(modelUrl);
  if (ext === 'hyp') return generateHypThumbnail(modelUrl);
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return generateImageThumbnail(modelUrl);

  // Audio, video, and unknown formats — no auto-thumbnail
  return null;
}

/** Fetch via proxy if external URL */
async function fetchAsBlob(url: string): Promise<string> {
  let fetchUrl = url;
  if (!url.startsWith('/') && typeof window !== 'undefined' && !url.includes(window.location.hostname)) {
    try {
      const proxyRes = await fetch(`/api/proxy-asset?url=${encodeURIComponent(url)}`);
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        return URL.createObjectURL(blob);
      }
    } catch { /* use direct */ }
  }
  return fetchUrl;
}

/** VRM/GLB/GLTF → Three.js offscreen render */
async function generate3DThumbnail(modelUrl: string): Promise<string | null> {
  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');

    const width = 512, height = 512;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0eb);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 2, 3);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const loader = new GLTFLoader();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader.register((parser: any) => new VRMLoaderPlugin(parser));

    const loadUrl = await fetchAsBlob(modelUrl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gltf: any = await new Promise((resolve, reject) => {
      loader.load(loadUrl, resolve, undefined, reject);
    });

    const vrm = gltf.userData?.vrm;
    const modelScene = vrm && typeof vrm === 'object' && 'scene' in vrm
      ? (VRMUtils.rotateVRM0(vrm), vrm.scene)
      : gltf.scene;

    scene.add(modelScene);

    const box = new THREE.Box3().setFromObject(modelScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.8;
    camera.position.set(center.x + distance * 0.3, center.y + size.y * 0.1, center.z + distance);
    camera.lookAt(center);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    renderer.dispose();
    if (loadUrl !== modelUrl) URL.revokeObjectURL(loadUrl);
    return dataUrl;
  } catch (error) {
    console.error('3D thumbnail failed:', error);
    return null;
  }
}

/** STL → Three.js STLLoader render */
async function generateSTLThumbnail(url: string): Promise<string | null> {
  try {
    const THREE = await import('three');
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');

    const width = 512, height = 512;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0eb);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(1, 2, 3);
    scene.add(dir1);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const loader = new STLLoader();
    const loadUrl = await fetchAsBlob(url);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geometry: any = await new Promise((resolve, reject) => {
      loader.load(loadUrl, resolve, undefined, reject);
    });

    const material = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.6, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    mesh.position.sub(center);
    camera.position.set(maxDim, maxDim * 0.8, maxDim * 2);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    if (loadUrl !== url) URL.revokeObjectURL(loadUrl);
    return dataUrl;
  } catch (error) {
    console.error('STL thumbnail failed:', error);
    return null;
  }
}

/** HYP → extract GLB from .hyp binary, then render as 3D */
async function generateHypThumbnail(url: string): Promise<string | null> {
  try {
    const { parseHypFile, revokeHypBlobUrls } = await import('./hypParser');
    const result = await parseHypFile(url);
    if (!result || !result.glbBlobUrl) return null;

    const thumbnail = await generate3DThumbnail(result.glbBlobUrl);
    revokeHypBlobUrls(result);
    return thumbnail;
  } catch (error) {
    console.error('HYP thumbnail failed:', error);
    return null;
  }
}

/** Image → resize to 512x512 thumbnail */
async function generateImageThumbnail(url: string): Promise<string | null> {
  try {
    const loadUrl = await fetchAsBlob(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = loadUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Center-crop to square
    const srcSize = Math.min(img.width, img.height);
    const srcX = (img.width - srcSize) / 2;
    const srcY = (img.height - srcSize) / 2;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 512, 512);

    const dataUrl = canvas.toDataURL('image/png');
    if (loadUrl !== url) URL.revokeObjectURL(loadUrl);
    return dataUrl;
  } catch (error) {
    console.error('Image thumbnail failed:', error);
    return null;
  }
}

/**
 * Generate and upload thumbnail for an asset.
 */
export async function autoGenerateAndUploadThumbnail(
  assetId: string,
  modelUrl: string,
): Promise<string | null> {
  const dataUrl = await generateThumbnail(modelUrl);
  if (!dataUrl) return null;

  try {
    const res = await fetch('/api/admin/upload-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: dataUrl, avatarId: assetId }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.thumbnailUrl || null;
  } catch {
    return null;
  }
}
