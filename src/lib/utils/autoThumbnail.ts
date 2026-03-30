/**
 * Auto-generates a thumbnail by rendering a 3D model in an offscreen canvas.
 * Uses Three.js + GLTFLoader to load the model, render one frame, and capture as PNG.
 * Only works for VRM/GLB/GLTF files.
 */

export async function generateThumbnail(modelUrl: string): Promise<string | null> {
  // Only for 3D model files
  if (!/\.(vrm|glb|gltf)$/i.test(modelUrl)) return null;

  try {
    // Dynamic import Three.js to avoid bundling in non-3D pages
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');

    const width = 512;
    const height = 512;

    // Create offscreen renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0eb); // cream color matching site

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    // Load model
    const loader = new GLTFLoader();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loader.register((parser: any) => new VRMLoaderPlugin(parser));

    // Fetch via proxy if external URL
    let blobUrl: string | null = null;
    let loadUrl = modelUrl;

    if (!modelUrl.startsWith('/') && typeof window !== 'undefined' && !modelUrl.includes(window.location.hostname)) {
      try {
        const proxyRes = await fetch(`/api/proxy-asset?url=${encodeURIComponent(modelUrl)}`);
        if (proxyRes.ok) {
          const blob = await proxyRes.blob();
          blobUrl = URL.createObjectURL(blob);
          loadUrl = blobUrl;
        }
      } catch {
        // Use direct URL as fallback
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gltf: any = await new Promise((resolve, reject) => {
      loader.load(loadUrl, resolve, undefined, reject);
    });

    // Handle VRM
    const vrm = gltf.userData?.vrm;
    let modelScene: InstanceType<typeof THREE.Object3D>;

    if (vrm && typeof vrm === 'object' && 'scene' in vrm) {
      VRMUtils.rotateVRM0(vrm);
      modelScene = vrm.scene;
    } else {
      modelScene = gltf.scene;
    }

    scene.add(modelScene);

    // Auto-fit camera to model
    const box = new THREE.Box3().setFromObject(modelScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.8;

    camera.position.set(center.x + distance * 0.3, center.y + size.y * 0.1, center.z + distance);
    camera.lookAt(center);

    // Render
    renderer.render(scene, camera);

    // Capture
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Cleanup
    renderer.dispose();
    if (blobUrl) URL.revokeObjectURL(blobUrl);

    return dataUrl;
  } catch (error) {
    console.error('Auto-thumbnail generation failed:', error);
    return null;
  }
}

/**
 * Generate and upload thumbnail for an asset.
 * Returns the thumbnail URL or null if failed.
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
