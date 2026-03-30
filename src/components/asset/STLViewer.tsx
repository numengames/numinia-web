'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface STLViewerProps {
  url: string;
  name: string;
}

export function STLViewer({ url, name }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<{ triangles: number; volume: string } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    (async () => {
      try {
        const THREE = await import('three');
        const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

        if (disposed) return;

        const container = containerRef.current!;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f0eb);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambient);
        const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dir1.position.set(1, 2, 3);
        scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dir2.position.set(-2, -1, -1);
        scene.add(dir2);

        // Camera
        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Load STL
        const loader = new STLLoader();

        // Proxy external URLs
        let loadUrl = url;
        if (!url.startsWith('/') && typeof window !== 'undefined' && !url.includes(window.location.hostname)) {
          try {
            const proxyRes = await fetch(`/api/proxy-asset?url=${encodeURIComponent(url)}`);
            if (proxyRes.ok) {
              const blob = await proxyRes.blob();
              loadUrl = URL.createObjectURL(blob);
            }
          } catch { /* use direct */ }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geometry: any = await new Promise((resolve, reject) => {
          loader.load(loadUrl, resolve, undefined, reject);
        });

        if (disposed) { renderer.dispose(); return; }

        // Material — matte gray, good for 3D print preview
        const material = new THREE.MeshStandardMaterial({
          color: 0xb0b0b0,
          roughness: 0.6,
          metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Auto-fit
        geometry.computeBoundingBox();
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;

        mesh.position.sub(center);
        camera.position.set(distance * 0.5, distance * 0.4, distance);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);

        // Stats
        const triCount = geometry.index
          ? geometry.index.count / 3
          : (geometry.attributes.position?.count ?? 0) / 3;

        setStats({
          triangles: Math.round(triCount),
          volume: `${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}`,
        });

        setLoading(false);

        // Animate
        const animate = () => {
          if (disposed) return;
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Resize
        const onResize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        // Cleanup reference
        return () => {
          disposed = true;
          window.removeEventListener('resize', onResize);
          renderer.dispose();
          geometry.dispose();
          material.dispose();
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error('STL viewer error:', err);
        if (!disposed) { setError(true); setLoading(false); }
      }
    })();

    return () => { disposed = true; };
  }, [url]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
        <div className="text-4xl">🖨</div>
        <p className="text-sm text-gray-500">Could not load STL file</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
          Download file
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading STL...</p>
        </div>
      )}

      {/* Info badges */}
      {stats && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
          <Badge variant="secondary" className="bg-emerald-600 text-white text-[10px] shadow-md">
            STL
          </Badge>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] shadow-md">
            {stats.triangles.toLocaleString()} tris
          </Badge>
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] shadow-md">
            {stats.volume}
          </Badge>
        </div>
      )}

      <span className="absolute bottom-3 right-3 z-10 text-[10px] text-gray-400">
        3D Print Ready
      </span>
    </div>
  );
}
