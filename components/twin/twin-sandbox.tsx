"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function TwinSandbox() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const host: HTMLDivElement = container;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(5, 5, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.2, 5),
      new THREE.MeshStandardMaterial({ color: 0xdfe8ec })
    );
    floor.position.y = -0.1;
    scene.add(floor);

    const demoShapes = [
      { x: -2, z: -1.2, w: 2, d: 1.5, h: 1.3, color: 0x0b6f8a },
      { x: 1.2, z: -1.1, w: 2.3, d: 1.4, h: 0.9, color: 0x20a38a },
      { x: 0, z: 1.3, w: 2.6, d: 1.2, h: 1.1, color: 0xf07b5b }
    ];

    for (const item of demoShapes) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(item.w, item.h, item.d),
        new THREE.MeshStandardMaterial({ color: item.color })
      );
      mesh.position.set(item.x, item.h / 2, item.z);
      scene.add(mesh);
    }

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa0aa, 2.2));

    const directional = new THREE.DirectionalLight(0xffffff, 2.2);
    directional.position.set(4, 7, 5);
    scene.add(directional);

    function resize() {
      const width = host.clientWidth;
      const height = Math.max(320, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    function animate() {
      frame = requestAnimationFrame(animate);
      if (!reducedMotion.matches) {
        scene.rotation.y += 0.0018;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="twin-sandbox-wrap">
      <div className="twin-demo-badge">DEMO GENÉRICO · NO ES EL MERCADO METROPOLITANO</div>
      <div ref={containerRef} className="twin-sandbox" aria-label="Demostración 3D genérica de NAVIBORI Twin" />
      <p className="xr-note">
        Este modelo existe únicamente para validar rendering 3D y arquitectura. No representa un edificio, local o ruta real.
      </p>
    </div>
  );
}
