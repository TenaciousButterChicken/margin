"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loss } from "@/lib/lab/sim/gradient-descent";
import { useChannel, usePublish, usePulseToken } from "@/lib/lab/LabContext";

// 3D MSE bowl. Two modes:
//  • "marker"      — a small handle at (w0,w1) the user can drag along the
//                    surface; publishes new w_position on drag.
//  • "trail"       — same marker, plus the trail of past positions.
//                    Used during stepping (beats 4+) and especially for the
//                    cliff dive in beat 6 where the trail flies up.
// `shake` triggers a brief, large camera shake.

type Mode = "marker" | "trail";

const W_MIN = -3;
const W_MAX = 3;
const RES = 36;
const HEIGHT_CLAMP = 8; // visually clamp loss height for sane proportions

function buildBowlGeometry(): THREE.BufferGeometry {
  const verts: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const span = W_MAX - W_MIN;
  const Z: number[][] = [];
  let zmin = Infinity;
  let zmax = -Infinity;
  for (let i = 0; i <= RES; i++) {
    const w0 = W_MIN + (i / RES) * span;
    Z[i] = [];
    for (let j = 0; j <= RES; j++) {
      const w1 = W_MIN + (j / RES) * span;
      const z = Math.min(loss(w0, w1), HEIGHT_CLAMP);
      Z[i][j] = z;
      if (z < zmin) zmin = z;
      if (z > zmax) zmax = z;
    }
  }

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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function Bowl({
  draggable,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  draggable: boolean;
  onDragStart?: () => void;
  onDrag?: (w0: number, w1: number) => void;
  onDragEnd?: () => void;
}) {
  const geom = useMemo(buildBowlGeometry, []);
  // For drag we use a flat plane raycast at y=HEIGHT_CLAMP/2 so the cursor
  // maps cleanly to (w0, w1) regardless of where on the bowl they aim.
  // Simpler than ray-against-mesh and feels intuitive.
  function pointer(e: ThreeEvent<PointerEvent>): { w0: number; w1: number } | null {
    const p = e.point;
    return { w0: clamp(p.x, W_MIN, W_MAX), w1: clamp(p.z, W_MIN, W_MAX) };
  }

  return (
    <>
      <mesh
        geometry={geom}
        onPointerDown={(e) => {
          if (!draggable) return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          onDragStart?.();
          const w = pointer(e);
          if (w) onDrag?.(w.w0, w.w1);
        }}
        onPointerMove={(e) => {
          if (!draggable || (e.buttons & 1) === 0) return;
          const w = pointer(e);
          if (w) onDrag?.(w.w0, w.w1);
        }}
        onPointerUp={() => onDragEnd?.()}
      >
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.62}
          side={THREE.DoubleSide}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      <mesh geometry={geom}>
        <meshBasicMaterial color="#3F3F3B" wireframe transparent opacity={0.18} />
      </mesh>
    </>
  );
}

function Marker({ position, dragging }: { position: [number, number, number]; dragging: boolean }) {
  // The position handle: hiker silhouette + ring on the surface.
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.36, 8]} />
        <meshStandardMaterial color="#1A1A18" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#FAFAF9" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.07, 0.014, 8, 16]} />
        <meshStandardMaterial color="#C2410C" emissive="#C2410C" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.1, 32]} />
        <meshBasicMaterial color="#C2410C" side={THREE.DoubleSide} transparent opacity={dragging ? 1 : 0.8} />
      </mesh>
      {dragging && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.13, 0.18, 32]} />
          <meshBasicMaterial color="#C2410C" side={THREE.DoubleSide} transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}

function Trail({ points }: { points: [number, number, number][] }) {
  if (points.length < 2) return null;
  return <Line points={points} color="#C2410C" lineWidth={2.2} transparent opacity={0.75} />;
}

function Minimum() {
  return (
    <group position={[0, 0.04, 1]}>
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#0D9488" emissive="#0D9488" emissiveIntensity={0.5} />
      </mesh>
      <Html
        position={[0.16, 0.06, 0]}
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

function FrameAxes() {
  const c = "#D4D4CE";
  const len = (W_MAX - W_MIN) * 1.05;
  return (
    <>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, len, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={[0, HEIGHT_CLAMP / 2, 0]}>
        <cylinderGeometry args={[0.005, 0.005, HEIGHT_CLAMP, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, len, 8]} />
        <meshBasicMaterial color={c} />
      </mesh>
    </>
  );
}

function AxisLabels() {
  return (
    <>
      <Html position={[W_MAX + 0.2, 0, 0]} style={labelStyle}>w₀</Html>
      <Html position={[0, 0, W_MAX + 0.2]} style={labelStyle}>w₁</Html>
      <Html position={[0, HEIGHT_CLAMP + 0.3, 0]} style={labelStyle}>cost</Html>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#767670",
  pointerEvents: "none",
};

function CameraSetup() {
  // Frame the whole bowl with the minimum visible. Looking down-and-into
  // the bowl from a comfortable angle — the previous default was zoomed
  // in too far and clipped the minimum.
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(5.5, 6.5, 6.5);
    camera.lookAt(0, HEIGHT_CLAMP * 0.4, 0);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function CameraShake({ active }: { active: boolean }) {
  // Brief, decaying shake added to the camera position.
  const { camera } = useThree();
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (active) startTime.current = performance.now();
  }, [active]);

  useFrame(() => {
    if (startTime.current === null) return;
    const elapsed = performance.now() - startTime.current;
    const duration = 600;
    if (elapsed > duration) {
      startTime.current = null;
      return;
    }
    const t = elapsed / duration;
    const decay = (1 - t) ** 2;
    const amp = 0.18 * decay;
    camera.position.x += (Math.random() - 0.5) * amp;
    camera.position.y += (Math.random() - 0.5) * amp;
    camera.position.z += (Math.random() - 0.5) * amp;
  });

  return null;
}

type Pos = { w0: number; w1: number };

export function Surface3D({
  draggable = false,
  mode = "marker",
}: {
  draggable?: boolean;
  mode?: Mode;
}) {
  const pub = usePublish();
  const [dragging, setDragging] = useState(false);
  const channelPos = useChannel<Pos>("w_position");
  const history =
    useChannel<{ w0: number; w1: number; loss: number }[]>("w_history") ?? [];
  const shakeToken = usePulseToken("camera_shake");
  const [shaking, setShaking] = useState(false);

  // Trigger shake when the channel pulses. Run for ~600ms.
  useEffect(() => {
    if (shakeToken === 0) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 650);
    return () => clearTimeout(t);
  }, [shakeToken]);

  const pos: Pos = channelPos ?? { w0: 0, w1: 0 };
  const markerY = clamp(loss(pos.w0, pos.w1), 0, HEIGHT_CLAMP);

  // Trail uses w_history when available, otherwise just the current position.
  const trailPoints: [number, number, number][] = mode === "trail" && history.length > 1
    ? history.map((p) => [
        clamp(p.w0, W_MIN, W_MAX),
        Math.min(p.loss, HEIGHT_CLAMP) + 0.02,
        clamp(p.w1, W_MIN, W_MAX),
      ])
    : [];

  return (
    <div style={{ width: "100%", height: 380, background: "var(--neutral-50)" }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 38, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraSetup />
        <CameraShake active={shaking} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <directionalLight position={[-3, 4, -2]} intensity={0.25} />
        <FrameAxes />
        <Bowl
          draggable={draggable}
          onDragStart={() => setDragging(true)}
          onDrag={(w0, w1) => {
            pub.set("w_position", { w0, w1 });
          }}
          onDragEnd={() => setDragging(false)}
        />
        <Minimum />
        {trailPoints.length > 1 && <Trail points={trailPoints} />}
        <Marker position={[clamp(pos.w0, W_MIN, W_MAX), markerY, clamp(pos.w1, W_MIN, W_MAX)]} dragging={dragging} />
        <AxisLabels />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, HEIGHT_CLAMP * 0.4, 0]}
          enabled={!dragging}
        />
      </Canvas>
    </div>
  );
}
