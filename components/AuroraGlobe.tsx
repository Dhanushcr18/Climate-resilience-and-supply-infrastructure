"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function AuroraGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 680;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 26);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x14f1d9, 2.0);
    dirLight1.position.set(15, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8b7cff, 1.8);
    dirLight2.position.set(-15, -10, 10);
    scene.add(dirLight2);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Wireframe globe
    const globeGeo = new THREE.SphereGeometry(9, 48, 48);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x05070d,
      emissive: 0x091428,
      shininess: 30,
      transparent: true,
      opacity: 0.92,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // Outer grid lattice
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(9.08, 28, 28));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x14f1d9,
      transparent: true,
      opacity: 0.18,
    });
    const wireLines = new THREE.LineSegments(wireGeo, wireMat);
    globeGroup.add(wireLines);

    // Atmosphere halo glow ring
    const ringGeo = new THREE.RingGeometry(9.4, 11.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x14f1d9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.3;
    globeGroup.add(ringMesh);

    // Regional Telemetry Nodes
    const cityCoords = [
      { name: "Kochi Hub", lat: 9.93, lon: 76.26, color: 0x22e3a0, size: 0.35, highRisk: false },
      { name: "Bengaluru DC", lat: 12.97, lon: 77.59, color: 0x3ddcff, size: 0.4, highRisk: false },
      { name: "Mangaluru Port", lat: 12.91, lon: 74.85, color: 0xff3b5c, size: 0.45, highRisk: true },
      { name: "Chennai Terminal", lat: 13.08, lon: 80.27, color: 0x8b7cff, size: 0.35, highRisk: false },
      { name: "Kozhikode Dep", lat: 11.25, lon: 75.78, color: 0xff8a3d, size: 0.35, highRisk: true },
      { name: "Coimbatore Hub", lat: 11.01, lon: 76.95, color: 0x22e3a0, size: 0.3, highRisk: false },
    ];

    function latLonToVec3(lat: number, lon: number, radius: number) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    }

    const nodePoints: THREE.Vector3[] = [];

    cityCoords.forEach((city) => {
      const pos = latLonToVec3(city.lat, city.lon, 9.15);
      nodePoints.push(pos);

      const nodeGeo = new THREE.SphereGeometry(city.size, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({ color: city.color });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      globeGroup.add(nodeMesh);

      if (city.highRisk) {
        const pulseRingGeo = new THREE.RingGeometry(city.size * 1.3, city.size * 2.2, 24);
        const pulseRingMat = new THREE.MeshBasicMaterial({
          color: city.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
        pulseRing.position.copy(pos);
        pulseRing.lookAt(pos.clone().multiplyScalar(2));
        globeGroup.add(pulseRing);
      }
    });

    // Connecting Arcs (Corridors)
    const routes = [
      { start: 0, end: 1, color: 0x14f1d9, elevated: 1.8 },
      { start: 1, end: 2, color: 0xff3b5c, elevated: 2.2 }, // Blocked Shiradi
      { start: 1, end: 3, color: 0x8b7cff, elevated: 1.5 },
      { start: 0, end: 4, color: 0xff8a3d, elevated: 1.6 },
      { start: 4, end: 5, color: 0x22e3a0, elevated: 1.4 },
      { start: 0, end: 5, color: 0x14f1d9, elevated: 1.5 },
      { start: 0, end: 2, color: 0x14f1d9, elevated: 2.8, isReroute: true }, // Reroute arc
    ];

    const pulses: { mesh: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; t: number; speed: number }[] = [];

    routes.forEach((r) => {
      const p1 = nodePoints[r.start];
      const p2 = nodePoints[r.end];
      if (!p1 || !p2) return;

      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const distance = p1.distanceTo(p2);
      mid.normalize().multiplyScalar(9.15 + (r.elevated || distance * 0.35));

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const curvePoints = curve.getPoints(40);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: r.color,
        transparent: true,
        opacity: r.isReroute ? 0.95 : 0.65,
      });
      const arcLine = new THREE.Line(lineGeo, lineMat);
      globeGroup.add(arcLine);

      // Photon beacon
      const pulseGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      globeGroup.add(pulseMesh);
      pulses.push({
        mesh: pulseMesh,
        curve,
        t: Math.random(),
        speed: 0.005 + Math.random() * 0.005,
      });
    });

    // Ambient particle cloud
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = 10 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePos[i * 3 + 2] = r * Math.cos(phi);

      if (Math.random() > 0.5) {
        particleColors[i * 3] = 0.08;
        particleColors[i * 3 + 1] = 0.95;
        particleColors[i * 3 + 2] = 0.85;
      } else {
        particleColors[i * 3] = 0.54;
        particleColors[i * 3 + 1] = 0.48;
        particleColors[i * 3 + 2] = 1.0;
      }
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(particles);

    // Center view towards South India
    globeGroup.rotation.y = 1.35;
    globeGroup.rotation.x = 0.35;

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Subtle atmospheric rotation
      globeGroup.rotation.y += 0.0012;

      // Update travelling photon pulses
      pulses.forEach((p) => {
        p.t = (p.t + p.speed) % 1;
        const pos = p.curve.getPoint(p.t);
        p.mesh.position.copy(pos);
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 680;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none"
    />
  );
}
