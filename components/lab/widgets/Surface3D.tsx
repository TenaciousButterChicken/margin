"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { gradient, loss } from "@/lib/lab/sim/gradient-descent";
import { useChannel, usePublish, usePulseToken } from "@/lib/lab/LabContext";

// 3D MSE bowl. Modes & overlays:
//  • draggable        - drag the marker on the surface (publishes w_position)
//  • mode = "trail"   - render the trail of past w_history positions
//  • showGradient     - visible 3D arrow at hiker pointing in -gradient
//                       direction. Length proportional to |gradient|. Used
//                       by beats 3 and 4 to make the gradient visible.
//  • fogIntensity ∈[0,1]  - blacks out the bowl outside a radius around
//                       the hiker. Used by beat 3 (blindfolded).
//  • shake on `camera_shake` channel pulse - beat 6 cliff dive

type Mode = "marker" | "trail";
type ArrowVariant = "none" | "single";

const W_MIN = -3;
const W_MAX = 3;
const RES = 36;
const HEIGHT_CLAMP = 8;

// --- Bowl geometry + colors --------------------------------------------------

type BowlData = {
  geom: THREE.BufferGeometry;
  baseColors: Float32Array;
  positions: Float32Array;
};

function buildBowlData(): BowlData {
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
  const positions = new Float32Array(verts);
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const baseColors = new Float32Array(colors);
  // Allocate a separate color buffer that we'll overwrite each frame for fog.
  geom.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(colors), 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return { geom, baseColors, positions };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// --- Bowl mesh with fog modulation -------------------------------------------

function Bowl({
  draggable,
  fogIntensity,
  fogCenter,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  draggable: boolean;
  fogIntensity: number;     // 0 = no fog, 1 = max fog
  fogCenter: [number, number]; // (w0, w1)
  onDragStart?: () => void;
  onDrag?: (w0: number, w1: number) => void;
  onDragEnd?: () => void;
}) {
  const data = useMemo(buildBowlData, []);
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  // Fog math: each frame, lerp each vertex's color toward dark based on
  // its distance from the fog center. Within VISIBLE_RADIUS = full color.
  // Outside FADE_RADIUS = fully dark. In between, smooth transition.
  useFrame(() => {
    if (fogIntensity <= 0.001) {
      // Reset to base colors and skip per-vertex math.
      const colorAttr = data.geom.attributes.color as THREE.BufferAttribute;
      const arr = colorAttr.array as Float32Array;
      // Only do the copy if it was modified.
      if (arr[0] !== data.baseColors[0]) {
        arr.set(data.baseColors);
        colorAttr.needsUpdate = true;
      }
      return;
    }

    const VISIBLE_RADIUS = 0.45 + 1.6 * (1 - fogIntensity); // grows as fog clears
    const FADE_RADIUS = VISIBLE_RADIUS + 0.7;

    const colorAttr = data.geom.attributes.color as THREE.BufferAttribute;
    const arr = colorAttr.array as Float32Array;
    const positions = data.positions;
    const dark = 0.06; // dark gray brightness target

    for (let i = 0, p = 0; i < positions.length; i += 3, p += 3) {
      const vx = positions[i];
      const vz = positions[i + 2];
      const dx = vx - fogCenter[0];
      const dz = vz - fogCenter[1];
      const d = Math.hypot(dx, dz);

      let attenuation: number;
      if (d <= VISIBLE_RADIUS) attenuation = 1;
      else if (d >= FADE_RADIUS) attenuation = 0;
      else attenuation = 1 - (d - VISIBLE_RADIUS) / (FADE_RADIUS - VISIBLE_RADIUS);
      // Smoothstep for nicer transition
      attenuation = attenuation * attenuation * (3 - 2 * attenuation);

      const baseR = data.baseColors[p];
      const baseG = data.baseColors[p + 1];
      const baseB = data.baseColors[p + 2];
      arr[p]     = dark + (baseR - dark) * attenuation;
      arr[p + 1] = dark + (baseG - dark) * attenuation;
      arr[p + 2] = dark + (baseB - dark) * attenuation;
    }
    colorAttr.needsUpdate = true;
  });

  function pointer(e: ThreeEvent<PointerEvent>): { w0: number; w1: number } | null {
    const p = e.point;
    return { w0: clamp(p.x, W_MIN, W_MAX), w1: clamp(p.z, W_MIN, W_MAX) };
  }

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={data.geom}
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
      <mesh ref={wireRef} geometry={data.geom}>
        <meshBasicMaterial color="#3F3F3B" wireframe transparent opacity={0.18} />
      </mesh>
    </>
  );
}

// --- Hiker + minimum + axes (small visuals) ---------------------------------

function Marker({
  position,
  dragging,
  glow = false,
}: {
  position: [number, number, number];
  dragging: boolean;
  glow?: boolean;
}) {
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
        <meshStandardMaterial color="#C2410C" emissive="#C2410C" emissiveIntensity={glow ? 0.9 : 0.3} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.1, 32]} />
        <meshBasicMaterial color="#C2410C" side={THREE.DoubleSide} transparent opacity={dragging ? 1 : 0.8} />
      </mesh>
      {(dragging || glow) && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.13, 0.22, 32]} />
          <meshBasicMaterial color="#C2410C" side={THREE.DoubleSide} transparent opacity={glow ? 0.6 : 0.4} />
        </mesh>
      )}
      {glow && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.36, 32]} />
          <meshBasicMaterial color="#C2410C" side={THREE.DoubleSide} transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  );
}

function Trail({ points }: { points: [number, number, number][] }) {
  if (points.length < 2) return null;
  return <Line points={points} color="#C2410C" lineWidth={2.2} transparent opacity={0.75} />;
}

function Minimum({ visible }: { visible: boolean }) {
  if (!visible) return null;
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

// --- Gradient arrow ---------------------------------------------------------
//
// A 3D arrow at the hiker, pointing in the *downhill* direction (= -gradient).
// Length is proportional to |gradient| (with a min/max). This is the visible
// expression of "the gradient is what you feel under your feet."

function GradientArrow({
  pos,
  color = "#0891B2",
  direction = "downhill",
}: {
  pos: { w0: number; w1: number };
  color?: string;
  direction?: "downhill" | "uphill";
}) {
  const [g0, g1] = gradient(pos.w0, pos.w1);
  const mag = Math.hypot(g0, g1);
  if (mag < 0.01) return null; // tiny arrow at the bottom looks bad

  // Downhill = -gradient direction. Uphill = +gradient (the descent⇄ascent toggle).
  const sign = direction === "downhill" ? -1 : 1;
  const dirX = (sign * g0) / mag;
  const dirZ = (sign * g1) / mag;

  // Length: scale magnitude into a sensible visual range.
  const length = clamp(mag * 0.35, 0.18, 1.2);
  const headLen = clamp(length * 0.32, 0.08, 0.3);
  const shaftLen = length - headLen;

  // Position the arrow so its tail starts at the hiker and tip points downhill.
  const hikerY = clamp(loss(pos.w0, pos.w1), 0, HEIGHT_CLAMP) + 0.04;
  // Midpoint of the shaft
  const midX = pos.w0 + (dirX * shaftLen) / 2;
  const midZ = pos.w1 + (dirZ * shaftLen) / 2;
  // Tip position
  const tipX = pos.w0 + dirX * (shaftLen + headLen / 2);
  const tipZ = pos.w1 + dirZ * (shaftLen + headLen / 2);

  // Quaternion to point cylinder/cone along the (dirX, 0, dirZ) direction.
  // Default cylinder/cone orient along +Y. We need to align +Y → (dirX, 0, dirZ).
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dirX, 0, dirZ)
  );
  const euler = new THREE.Euler().setFromQuaternion(quat);

  return (
    <group>
      {/* Shaft */}
      <mesh position={[midX, hikerY, midZ]} rotation={euler}>
        <cylinderGeometry args={[0.025, 0.025, shaftLen, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[tipX, hikerY, tipZ]} rotation={euler}>
        <coneGeometry args={[0.07, headLen, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// --- Frame & shake ---------------------------------------------------------

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

// --- Main exported component ------------------------------------------------

type Pos = { w0: number; w1: number };

export function Surface3D({
  draggable = false,
  mode = "marker",
  showGradient = "none" as ArrowVariant,
  arrowDirection = "downhill",
  fogIntensity = 0,
  showMinimumMarker = true,
  hikerGlow = false,
}: {
  draggable?: boolean;
  mode?: Mode;
  showGradient?: ArrowVariant;
  arrowDirection?: "downhill" | "uphill";
  /** 0 = no fog (full bowl visible). 1 = max fog (only hiker's vicinity). */
  fogIntensity?: number;
  showMinimumMarker?: boolean;
  hikerGlow?: boolean;
}) {
  const pub = usePublish();
  const [dragging, setDragging] = useState(false);
  const channelPos = useChannel<Pos>("w_position");
  const history =
    useChannel<{ w0: number; w1: number; loss: number }[]>("w_history") ?? [];
  const shakeToken = usePulseToken("camera_shake");
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (shakeToken === 0) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 650);
    return () => clearTimeout(t);
  }, [shakeToken]);

  const pos: Pos = channelPos ?? { w0: 0, w1: 0 };
  const markerY = clamp(loss(pos.w0, pos.w1), 0, HEIGHT_CLAMP);

  const trailPoints: [number, number, number][] = mode === "trail" && history.length > 1
    ? history.map((p) => [
        clamp(p.w0, W_MIN, W_MAX),
        Math.min(p.loss, HEIGHT_CLAMP) + 0.02,
        clamp(p.w1, W_MIN, W_MAX),
      ])
    : [];

  return (
    <div style={{ width: "100%", height: 560, background: "var(--neutral-50)" }}>
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
          fogIntensity={fogIntensity}
          fogCenter={[clamp(pos.w0, W_MIN, W_MAX), clamp(pos.w1, W_MIN, W_MAX)]}
          onDragStart={() => setDragging(true)}
          onDrag={(w0, w1) => {
            pub.set("w_position", { w0, w1 });
          }}
          onDragEnd={() => setDragging(false)}
        />
        <Minimum visible={showMinimumMarker && fogIntensity < 0.5} />
        {trailPoints.length > 1 && <Trail points={trailPoints} />}
        <Marker
          position={[clamp(pos.w0, W_MIN, W_MAX), markerY, clamp(pos.w1, W_MIN, W_MAX)]}
          dragging={dragging}
          glow={hikerGlow}
        />
        {showGradient === "single" && (
          <GradientArrow pos={pos} direction={arrowDirection} />
        )}
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
