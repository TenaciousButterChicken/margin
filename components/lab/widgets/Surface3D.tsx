"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { loss } from "@/lib/lab/sim/gradient-descent";
import { useChannel } from "@/lib/lab/LabContext";

// Real-3D MSE bowl. Renders the loss surface for the linear-regression
// dataset over a (w0,w1) range, plus the hiker's current position and the
// trail of past positions. Per design brief §9.3 — buttery smooth, drag
// to rotate, scroll to zoom, "physics textbook diagram, but interactive."

const W_MIN = -1.7;
const W_MAX = 1.7;
const RES = 36; // grid resolution per axis — 36² = 1,296 verts; cheap.

function buildBowlGeometry(): THREE.BufferGeometry {
  const verts: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const span = W_MAX - W_MIN;
  // Compute losses + min/max for color mapping
  const Z: number[][] = [];
  let zmin = Infinity;
  let zmax = -Infinity;
  for (let i = 0; i <= RES; i++) {
    const w0 = W_MIN + (i / RES) * span;
    Z[i] = [];
    for (let j = 0; j <= RES; j++) {
      const w1 = W_MIN + (j / RES) * span;
      const z = Math.min(loss(w0, w1), 6); // clamp the visual height
      Z[i][j] = z;
      if (z < zmin) zmin = z;
      if (z > zmax) zmax = z;
    }
  }

  // Two warm colors for height shading — pulled from token palette.
  // Low (--accent-subtle) → high (--accent at lower opacity via vertex alpha
  // baked as color blend).
  const cLow = new THREE.Color("#FCF4EE");
  const cHigh = new THREE.Color("#B5532A");

  for (let i = 0; i <= RES; i++) {
    const w0 = W_MIN + (i / RES) * span;
    for (let j = 0; j <= RES; j++) {
      const w1 = W_MIN + (j / RES) * span;
      const z = Z[i][j];
      verts.push(w0, z, w1);
      const t = (z - zmin) / (zmax - zmin || 1);
      const c = cLow.clone().lerp(cHigh, t);
      colors.push(c.r, c.g, c.b);
    }
  }

  for (let i = 0; i < RES; i++) {
    for (let j = 0; j < RES; j++) {
      const a = i * (RES + 1) + j;
      const b = a + 1;
      const c = a + (RES + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function Bowl() {
  const geom = useMemo(buildBowlGeometry, []);
  return (
    <>
      {/* Filled surface — vertex-colored, slightly transparent so wireframe shows */}
      <mesh geometry={geom}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.62}
          side={THREE.DoubleSide}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      {/* Wireframe overlay — quiet brown */}
      <mesh geometry={geom}>
        <meshBasicMaterial color="#3F3F3B" wireframe transparent opacity={0.18} />
      </mesh>
    </>
  );
}

function Hiker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Vertical pole pointing up from the surface — visible against the bowl */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.36, 8]} />
        <meshStandardMaterial color="#1A1A18" />
      </mesh>
      {/* Hiker head */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#FAFAF9" />
      </mesh>
      {/* Blindfold band (the recurring motif) */}
      <mesh position={[0, 0.4, 0]}>
        <torusGeometry args={[0.055, 0.011, 8, 16]} />
        <meshStandardMaterial color="#C2410C" />
      </mesh>
      {/* Footprint marker on the surface */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.07, 24]} />
        <meshBasicMaterial color="#C2410C" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Trail({ points }: { points: [number, number, number][] }) {
  if (points.length < 2) return null;
  return (
    <Line points={points} color="#C2410C" lineWidth={2} transparent opacity={0.7} />
  );
}

function Minimum({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#0D9488" emissive="#0D9488" emissiveIntensity={0.4} />
      </mesh>
      <Html
        position={[0.12, 0.06, 0]}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "#0D9488",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        minimum
      </Html>
    </group>
  );
}

function AxisLabels() {
  // Lightweight floating axis labels using HTML so they always face camera.
  return (
    <>
      <Html position={[W_MAX + 0.1, 0, 0]} style={labelStyle}>
        w₀
      </Html>
      <Html position={[0, 0, W_MAX + 0.1]} style={labelStyle}>
        w₁
      </Html>
      <Html position={[0, 6.1, 0]} style={labelStyle}>
        cost
      </Html>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#767670",
  pointerEvents: "none",
};

function FrameAxes() {
  // Three thin cylinders for x, y (cost), z axes.
  const c = "#D4D4CE";
  return (
    <>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, W_MAX * 2, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 6, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, W_MAX * 2, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
    </>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  // Set a pleasing initial isometric-ish angle.
  useMemo(() => {
    camera.position.set(2.6, 3.4, 3.6);
    camera.lookAt(0, 1.2, 0);
  }, [camera]);
  return null;
}

export function Surface3D() {
  const history =
    useChannel<{ w0: number; w1: number; loss: number }[]>("w_history") ?? [];

  const trailPoints: [number, number, number][] = history.map((p) => [
    clamp(p.w0, W_MIN, W_MAX),
    Math.min(p.loss, 6) + 0.02,
    clamp(p.w1, W_MIN, W_MAX),
  ]);
  const last = history[history.length - 1];
  const hikerPos: [number, number, number] = last
    ? [clamp(last.w0, W_MIN, W_MAX), Math.min(last.loss, 6), clamp(last.w1, W_MIN, W_MAX)]
    : [-1.4, Math.min(loss(-1.4, -1.2), 6), -1.2];

  return (
    <div style={{ width: "100%", height: 360, background: "var(--neutral-50)" }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 38, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraSetup />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <directionalLight position={[-3, 4, -2]} intensity={0.25} />
        <FrameAxes />
        <Bowl />
        <Minimum position={[0, 0.02, 1]} />
        <Trail points={trailPoints} />
        <Hiker position={hikerPos} />
        <AxisLabels />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 1.2, 0]}
        />
      </Canvas>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
