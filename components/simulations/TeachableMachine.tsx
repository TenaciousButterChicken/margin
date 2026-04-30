"use client";

import { useEffect, useRef, useState } from "react";

// Teachable Machine - webcam-based image classifier, KNN over MobileNet
// features. The technique:
//   1. Load MobileNet (pretrained on ImageNet, ~16MB).
//   2. For each frame the user records: extract MobileNet's penultimate-
//      layer activations (1024 numbers per frame) and add them to a KNN
//      classifier with the chosen class label.
//   3. Each frame after that: extract features → KNN.predictClass →
//      confidence per class. Update the bars.
//
// All processing on-device. No server. No frames leave the browser.

const MIN_SAMPLES_TO_PREDICT = 10;
const SAMPLE_INTERVAL_MS = 100;          // ~10 captures/sec while held
const PREDICTION_INTERVAL_MS = 90;       // throttle predict loop ~11 fps
const THUMBNAIL_LIMIT = 6;               // visible thumbnails per class
const TARGET_SAMPLES = 30;               // shown in the counter as the "✓" target

type CameraState = "off" | "requesting" | "streaming" | "denied" | "error";
type ModelState = "idle" | "loading" | "ready" | "error";

type ClassRow = {
  id: number;
  name: string;
  samples: number;
  thumbnails: string[]; // most recent N data URLs
};

const INITIAL_CLASSES: ClassRow[] = [
  { id: 0, name: "Class A", samples: 0, thumbnails: [] },
  { id: 1, name: "Class B", samples: 0, thumbnails: [] },
  { id: 2, name: "Class C", samples: 0, thumbnails: [] },
];

// Lazy refs to TF modules so they only load on this page.
type MobilenetModule = typeof import("@tensorflow-models/mobilenet");
type KnnModule = typeof import("@tensorflow-models/knn-classifier");
type TfModule = typeof import("@tensorflow/tfjs");
type MobilenetModel = Awaited<ReturnType<MobilenetModule["load"]>>;
type KnnClassifier = ReturnType<KnnModule["create"]>;

export function TeachableMachine() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tfRef = useRef<TfModule | null>(null);
  const mobilenetRef = useRef<MobilenetModel | null>(null);
  const knnRef = useRef<KnnClassifier | null>(null);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const predictIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [modelProgress, setModelProgress] = useState<string>("starting…");
  const [classes, setClasses] = useState<ClassRow[]>(INITIAL_CLASSES);
  const [recording, setRecording] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<number[]>([0, 0, 0]);
  const [topClass, setTopClass] = useState<number | null>(null);

  // Live snapshot of class samples for the predict interval.
  const classesRef = useRef<ClassRow[]>(INITIAL_CLASSES);
  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  /* -------- Load TF + MobileNet + KNN ------------------------------- */

  useEffect(() => {
    let cancelled = false;
    setModelState("loading");
    (async () => {
      try {
        setModelProgress("loading TensorFlow.js…");
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        if (cancelled) return;

        setModelProgress("loading MobileNet (~16 MB, one-time)…");
        const mobilenetModule = await import("@tensorflow-models/mobilenet");
        const mobilenet = await mobilenetModule.load({ version: 2, alpha: 1.0 });
        if (cancelled) return;

        setModelProgress("setting up KNN classifier…");
        const knnModule = await import("@tensorflow-models/knn-classifier");
        const knn = knnModule.create();

        tfRef.current = tf;
        mobilenetRef.current = mobilenet;
        knnRef.current = knn;
        setModelState("ready");
      } catch (err) {
        if (!cancelled) {
          console.error("[TeachableMachine] model load error", err);
          setModelState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Webcam --------------------------------------------------- */

  async function enableCamera() {
    if (cameraState === "streaming" || cameraState === "requesting") return;
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
      }
      setCameraState("streaming");
    } catch (err) {
      const e = err as { name?: string };
      console.error("[TeachableMachine] getUserMedia error", err);
      setCameraState(e?.name === "NotAllowedError" ? "denied" : "error");
    }
  }

  // Stop the stream on unmount so the camera light goes off.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (predictIntervalRef.current) clearInterval(predictIntervalRef.current);
    };
  }, []);

  /* -------- Recording (hold to add samples) ------------------------- */

  function startRecording(classId: number) {
    if (modelState !== "ready" || cameraState !== "streaming") return;
    if (recordIntervalRef.current) return;
    setRecording(classId);

    recordIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const mobilenet = mobilenetRef.current;
      const knn = knnRef.current;
      if (!video || !mobilenet || !knn) return;
      if (video.readyState < 2) return;

      // Penultimate-layer features ("embedding"). MobileNet#infer with
      // second arg = true returns the conv embedding instead of logits.
      const features = mobilenet.infer(video, true);
      knn.addExample(features, classId);
      features.dispose();

      // Capture a small thumbnail for visual feedback.
      const thumb = captureThumbnail(video);

      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                samples: c.samples + 1,
                thumbnails: [thumb, ...c.thumbnails].slice(0, THUMBNAIL_LIMIT),
              }
            : c
        )
      );
    }, SAMPLE_INTERVAL_MS);
  }

  function stopRecording() {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setRecording(null);
  }

  /* -------- Prediction loop ----------------------------------------- */

  // Recompute eligibility (≥2 classes have ≥MIN_SAMPLES_TO_PREDICT)
  const trainedClassCount = classes.filter((c) => c.samples >= MIN_SAMPLES_TO_PREDICT).length;
  const canPredict = trainedClassCount >= 2;

  useEffect(() => {
    if (!canPredict || modelState !== "ready" || cameraState !== "streaming") {
      if (predictIntervalRef.current) {
        clearInterval(predictIntervalRef.current);
        predictIntervalRef.current = null;
      }
      return;
    }
    if (predictIntervalRef.current) return; // already running

    predictIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const mobilenet = mobilenetRef.current;
      const knn = knnRef.current;
      if (!video || !mobilenet || !knn) return;
      if (video.readyState < 2) return;
      if (knn.getNumClasses() < 2) return;

      try {
        const features = mobilenet.infer(video, true);
        const result = await knn.predictClass(features);
        features.dispose();

        // result.confidences is keyed by class id (number). KNN may return
        // string keys depending on version - handle both.
        const confs: Record<string, number> = result.confidences as Record<string, number>;
        const next = classesRef.current.map((c) => {
          const k = c.id.toString();
          return (confs[k] as number | undefined) ?? (confs[c.id as unknown as string] as number | undefined) ?? 0;
        });
        setPredictions(next);
        let bestIdx = 0;
        let bestVal = -Infinity;
        next.forEach((v, i) => {
          if (v > bestVal) {
            bestVal = v;
            bestIdx = i;
          }
        });
        setTopClass(bestVal > 0 ? bestIdx : null);
      } catch {
        // skip frame
      }
    }, PREDICTION_INTERVAL_MS);

    return () => {
      if (predictIntervalRef.current) {
        clearInterval(predictIntervalRef.current);
        predictIntervalRef.current = null;
      }
    };
  }, [canPredict, modelState, cameraState]);

  /* -------- Class actions ------------------------------------------- */

  function renameClass(id: number, name: string) {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  function clearClass(id: number) {
    if (knnRef.current && knnRef.current.getNumClasses() > 0) {
      try {
        knnRef.current.clearClass(id);
      } catch {
        // class may not exist yet - ignore
      }
    }
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, samples: 0, thumbnails: [] } : c))
    );
  }

  function clearAll() {
    if (knnRef.current) knnRef.current.clearAllClasses();
    setClasses(INITIAL_CLASSES.map((c) => ({ ...c, thumbnails: [], samples: 0 })));
    setPredictions([0, 0, 0]);
    setTopClass(null);
  }

  /* -------- Render --------------------------------------------------- */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, alignItems: "center" }}>
      {/* Webcam preview */}
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            background: "var(--neutral-100)",
            borderRadius: 12,
            border: "1px solid var(--neutral-200)",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: cameraState === "streaming" ? "block" : "none",
              transform: "scaleX(-1)", // mirror so it feels like a mirror
            }}
          />
          {cameraState !== "streaming" && (
            <CameraPlaceholder state={cameraState} onEnable={enableCamera} />
          )}
          {modelState === "loading" && cameraState === "streaming" && (
            <ModelOverlay text={modelProgress} />
          )}
        </div>

        {/* Tiny subtitle: privacy + model state */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
          }}
        >
          <span>🔒 nothing leaves your browser</span>
          <span>
            {modelState === "loading" && `model: ${modelProgress}`}
            {modelState === "ready" && "model: ready"}
            {modelState === "error" && "model: failed to load"}
            {modelState === "idle" && ""}
          </span>
        </div>
      </div>

      {/* Three class cards */}
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {classes.map((c) => (
          <ClassCard
            key={c.id}
            row={c}
            recording={recording === c.id}
            disabled={modelState !== "ready" || cameraState !== "streaming"}
            isTopClass={topClass === c.id}
            onRename={(name) => renameClass(c.id, name)}
            onStart={() => startRecording(c.id)}
            onStop={stopRecording}
            onClear={() => clearClass(c.id)}
          />
        ))}
      </div>

      {/* Live prediction bars (only once predictable) */}
      {canPredict ? (
        <div
          style={{
            width: "100%",
            maxWidth: 880,
            background: "var(--neutral-0)",
            border: "1px solid var(--neutral-200)",
            borderRadius: 12,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="t-meta">Live prediction</span>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--lab-cyan)" }}>
              ● live · ~10 fps
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {classes.map((c, i) => (
              <PredictionBar
                key={c.id}
                name={c.name}
                value={predictions[i] ?? 0}
                top={topClass === c.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            maxWidth: 880,
            padding: "16px 20px",
            background: "var(--neutral-50)",
            border: "1px dashed var(--neutral-300)",
            borderRadius: 12,
            fontSize: 13,
            color: "var(--neutral-500)",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
          }}
        >
          collect ≥{MIN_SAMPLES_TO_PREDICT} samples in at least 2 classes to start the live prediction
        </div>
      )}

      {/* Reset all */}
      {classes.some((c) => c.samples > 0) && (
        <button onClick={clearAll} className="btn btn-ghost btn-sm" style={{ alignSelf: "center" }}>
          Reset all classes
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   Subcomponents
   ========================================================================= */

function CameraPlaceholder({ state, onEnable }: { state: CameraState; onEnable: () => void }) {
  if (state === "denied") {
    return (
      <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
          Camera access denied
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--neutral-700)", lineHeight: 1.5 }}>
          The Teachable Machine needs your webcam. Enable camera access in your
          browser&rsquo;s site settings, then reload this page.
        </p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
          Couldn&rsquo;t open the camera
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--neutral-700)", lineHeight: 1.5 }}>
          No camera was found, or it&rsquo;s in use by another app. Try closing
          other tabs that might be using it.
        </p>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", padding: 24 }}>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 14,
          color: "var(--neutral-700)",
          lineHeight: 1.55,
          maxWidth: 360,
        }}
      >
        Train a webcam classifier in 30 seconds. Click below to enable your
        camera. Nothing leaves your browser.
      </p>
      <button onClick={onEnable} className="btn btn-primary" disabled={state === "requesting"}>
        {state === "requesting" ? "requesting access…" : "Enable camera"}
      </button>
    </div>
  );
}

function ModelOverlay({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(255,255,255,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
        backdropFilter: "blur(2px)",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--neutral-700)",
      }}
    >
      <Spinner />
      <span>{text}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        border: "2px solid var(--neutral-200)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        animation: "tmSpin 700ms linear infinite",
      }}
    >
      <style jsx>{`
        @keyframes tmSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function ClassCard({
  row,
  recording,
  disabled,
  isTopClass,
  onRename,
  onStart,
  onStop,
  onClear,
}: {
  row: ClassRow;
  recording: boolean;
  disabled: boolean;
  isTopClass: boolean;
  onRename: (name: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}) {
  const reachedTarget = row.samples >= TARGET_SAMPLES;

  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid",
        borderColor: isTopClass
          ? "var(--accent)"
          : recording
          ? "var(--lab-cyan)"
          : "var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 200ms",
      }}
    >
      {/* Editable class name */}
      <input
        type="text"
        value={row.name}
        onChange={(e) => onRename(e.target.value)}
        style={{
          width: "100%",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--neutral-900)",
          border: "none",
          outline: "none",
          background: "transparent",
          padding: 0,
        }}
      />

      {/* Thumbnail strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${THUMBNAIL_LIMIT}, 1fr)`,
          gap: 4,
          height: 44,
        }}
      >
        {Array.from({ length: THUMBNAIL_LIMIT }).map((_, i) => {
          const url = row.thumbnails[i];
          return (
            <div
              key={i}
              style={{
                background: "var(--neutral-100)",
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid var(--neutral-200)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {url ? (
                // Mirrored to match the video preview
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Sample count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
          {row.samples} {row.samples === 1 ? "sample" : "samples"}
          {reachedTarget && <span style={{ color: "var(--success)", marginLeft: 6 }}>✓</span>}
        </span>
        {row.samples > 0 && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--neutral-500)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            clear
          </button>
        )}
      </div>

      {/* Hold-to-record button */}
      <button
        onPointerDown={(e) => {
          if (disabled) return;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          onStart();
        }}
        onPointerUp={onStop}
        onPointerLeave={() => recording && onStop()}
        onPointerCancel={onStop}
        disabled={disabled}
        className={`btn ${recording ? "btn-primary" : "btn-secondary"}`}
        style={{
          width: "100%",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {recording ? "● recording…" : "Hold to record"}
      </button>
    </div>
  );
}

function PredictionBar({
  name,
  value,
  top,
}: {
  name: string;
  value: number;
  top: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value));
  const color = top ? "var(--accent)" : "var(--lab-cyan)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: top ? 600 : 400,
          color: top ? "var(--neutral-900)" : "var(--neutral-700)",
          minWidth: 120,
        }}
      >
        {name}
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          background: "var(--neutral-100)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: color,
            borderRadius: 4,
            transition: "width 90ms linear, background 200ms ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          fontWeight: top ? 600 : 400,
          color: top ? color : "var(--neutral-500)",
          minWidth: 44,
          textAlign: "right",
        }}
      >
        {(pct * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function captureThumbnail(video: HTMLVideoElement): string {
  const W = 80;
  const H = 60;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, W, H);
  return canvas.toDataURL("image/jpeg", 0.55);
}
