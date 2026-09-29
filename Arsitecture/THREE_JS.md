# THREE_JS.md — Playbook Elemen 3D (Ink/Toon Style)

Dokumen ini pelengkap `design.md` bagian 12. Baca bagian itu dulu untuk prinsip dan batasan sebelum membaca resep implementasi di bawah.

## 1. Kapan dokumen ini dipakai
Hanya saat mengerjakan task yang eksplisit meminta elemen 3D (mis. "T-3D.1 Stempel 3D di Mode Workout"). Jangan menambahkan three.js ke task lain secara inisiatif sendiri.

## 2. Instalasi
```bash
npm install three
npm install -D @types/three
```
Tidak perlu `@react-three/fiber` untuk MVP kecuali agent sudah familiar dan tim setuju — vanilla `three.js` di dalam `useEffect` lebih mudah dikontrol untuk cleanup dan performa di WebView.

## 3. Struktur folder
```
src/
  features/
    stamp3d/
      Stamp3DCanvas.tsx      (dynamic import target, client component)
      scene.ts               (setup scene/camera/renderer, murni fungsi, testable)
      inkMaterial.ts         (toon material + outline)
      useReducedMotionOr Fallback.ts
```

## 4. Pola load (wajib)
```tsx
// src/app/workout/[...]/page.tsx
import dynamic from 'next/dynamic';

const Stamp3DCanvas = dynamic(
  () => import('@/features/stamp3d/Stamp3DCanvas'),
  { ssr: false, loading: () => <StampFallback2D /> } // fallback 2D wajib
);
```
- `ssr: false` karena `three.js`/WebGL butuh `window`.
- `StampFallback2D` memakai `SfxStamp` 2D biasa dari sistem desain — dipakai juga saat `prefers-reduced-motion`, perangkat lemah, atau WebGL tidak tersedia.

## 5. Deteksi kelayakan sebelum render 3D
```ts
// src/features/stamp3d/canPlay3D.ts
export function canPlay3D(): boolean {
  if (typeof window === 'undefined') return false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```
Panggil ini sebelum mount `Stamp3DCanvas`; kalau `false`, langsung tampilkan fallback 2D tanpa mencoba inisialisasi Three.js sama sekali.

## 6. Setup scene minimal (toon + outline, hitam-putih)
```ts
// src/features/stamp3d/scene.ts
import * as THREE from 'three';

export function createInkScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   // batasi DPR
  renderer.setClearColor(0x000000, 0);                            // transparan, ikut --paper CSS

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
  camera.position.set(0, 0.6, 3);

  // Cahaya sederhana 2-tone (bukan PBR): satu directional untuk sisi terang/gelap
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(2, 3, 2);
  scene.add(light);

  return { renderer, scene, camera };
}

export function disposeInkScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  renderer.dispose();
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
    else if (mesh.material) (mesh.material as THREE.Material).dispose();
  });
}
```

## 7. Material toon 2-tingkat + outline (konsep)
Gunakan `THREE.MeshToonMaterial` dengan `gradientMap` 2 langkah (hitam/putih tegas, tanpa gradasi halus) untuk sisi terang-gelap objek, ditambah **outline** lewat teknik backface expansion (mesh kedua sedikit lebih besar, sisi dalam menghadap kamera, warna hitam solid).

```ts
// src/features/stamp3d/inkMaterial.ts
import * as THREE from 'three';

function twoToneGradientMap(): THREE.DataTexture {
  const data = new Uint8Array([0, 0, 255, 255]); // 2 langkah tegas: gelap, terang
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function createInkMaterial() {
  return new THREE.MeshToonMaterial({ color: 0xfafaf7, gradientMap: twoToneGradientMap() });
}

export function addOutline(mesh: THREE.Mesh, thickness = 0.03) {
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0b0b0b, side: THREE.BackSide });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.multiplyScalar(1 + thickness);
  mesh.add(outline);
  return outline;
}
```
Catatan: sesuaikan warna dengan `--ink`/`--paper` tema aktif (terang vs gelap = inversi), baca dari CSS variable saat inisialisasi, bukan hardcode permanen.

## 8. Loop render terkendali (wajib, cegah baterai/CPU boros)
```ts
let rafId: number | null = null;

function startLoop(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, tick: (dt: number) => void) {
  let last = performance.now();
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    tick(dt);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
}

// Wajib: hentikan saat tab/app tidak terlihat, dan saat komponen unmount
document.addEventListener('visibilitychange', () => {
  document.hidden ? stopLoop() : /* startLoop lagi jika perlu */ undefined;
});
```
Animasi stempel bukan loop terus-menerus — jalankan **sekali** saat trigger (set selesai), lalu `stopLoop()` otomatis setelah animasi selesai (±400–600 ms), bukan berjalan idle.

## 9. Komponen React (kerangka)
```tsx
// src/features/stamp3d/Stamp3DCanvas.tsx
'use client';
import { useEffect, useRef } from 'react';
import { createInkScene, disposeInkScene } from './scene';

export default function Stamp3DCanvas({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { renderer, scene, camera } = createInkScene(canvasRef.current);
    // ...tambah mesh stempel + outline, mainkan animasi jatuh saat `trigger` berubah...
    return () => disposeInkScene(renderer, scene);
  }, []); // init sekali

  useEffect(() => {
    // trigger animasi stempel setiap `trigger` bertambah (mis. tiap set selesai)
  }, [trigger]);

  return <canvas ref={canvasRef} aria-hidden="true" className="stamp3d-canvas" />;
}
```
`aria-hidden="true"` karena elemen ini dekoratif/penguat, bukan pembawa informasi wajib — informasi "set beres" tetap harus ada di teks/`SfxStamp` 2D untuk pembaca layar.

## 10. Ukuran bundle dan performa
- Cek ukuran chunk setelah build: `three` inti ±150 KB gzip; jangan impor keseluruhan `three/examples` kalau cuma butuh util kecil — impor spesifik (mis. `three/examples/jsm/...`) atau tulis sendiri fungsi minimal.
- Target: chunk 3D terpisah dari bundle utama (`dynamic import` sudah memastikan ini); verifikasi dengan `next build` output atau `@next/bundle-analyzer`.
- Uji FPS di perangkat Android menengah-bawah nyata; jika < 30fps konsisten, turunkan `antialias: false`, kurangi resolusi canvas (render ke ukuran lebih kecil lalu upscale CSS), atau nonaktifkan fitur 3D untuk perangkat itu.

## 11. Kriteria selesai (Definition of Done tambahan untuk task 3D)
- [ ] Fallback 2D benar-benar berfungsi (uji dengan `prefers-reduced-motion` aktif dan dengan WebGL dipaksa gagal)
- [ ] Render loop berhenti saat layar tidak terlihat; tidak ada memory leak (`dispose()` dipanggil saat unmount — cek dengan DevTools memory profiler)
- [ ] Gaya visual toon + outline hitam-putih, bukan material realistis
- [ ] Diuji di minimal satu perangkat Android menengah-bawah sungguhan, catat FPS kasar
- [ ] Elemen 3D bersifat pelengkap (`aria-hidden`), informasi tetap tersedia di teks/2D
- [ ] Ukuran bundle chunk 3D terpisah dari bundle utama, dikonfirmasi lewat build output
