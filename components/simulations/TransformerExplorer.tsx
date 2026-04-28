"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tokens } from "./transformer/Tokens";
import { AttentionGraph } from "./transformer/AttentionGraph";
import { Predictions } from "./transformer/Predictions";
import { Generate } from "./transformer/Generate";
import { PromptChips } from "./transformer/PromptChips";
import { EmbeddingExplorer } from "./transformer/EmbeddingExplorer";
import {
  decodeTokenId,
  loadModel,
  runInference,
  sampleFromDistribution,
  softmaxWithTemperature,
  topK,
  type AttentionSource,
  type InferenceResult,
  type LoadProgress,
  type TokenInfo,
} from "@/lib/simulations/transformer-core";

const DEFAULT_TEXT = "The cat sat on the";
const DEFAULT_LAYER = 5; // Layer 6 (0-indexed)
const DEFAULT_HEAD = 0; // Head 1
const DEFAULT_TEMP = 1.0;
const TOP_K = 10;

// Tight client-side blocklist. Substring match (case-insensitive). Only
// obvious slurs / explicit profanity — kept short to avoid false positives
// on normal academic words.
const BLOCKED_TERMS = [
  "nigger", "nigga",
  "faggot",
  "kike", "spic", "chink", "wetback",
  "retard",
  "fuck", "shit", "cunt", "pussy", "cock", "bitch", "asshole", "bastard",
  "porn",
];

const FILTER_TOAST_MS = 4000;

function isBlocked(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some((t) => lower.includes(t));
}

type ModelStage =
  | { kind: "loading"; progress: LoadProgress }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export function TransformerExplorer() {
  /* -------- Model loading ------------------------------------------ */
  const [stage, setStage] = useState<ModelStage>({
    kind: "loading",
    progress: { stage: "runtime" },
  });

  /* -------- Working state ------------------------------------------ */
  const [originalText, setOriginalText] = useState(DEFAULT_TEXT);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [draft, setDraft] = useState(DEFAULT_TEXT);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [inferring, setInferring] = useState(false);
  const [layerIdx, setLayerIdx] = useState(DEFAULT_LAYER);
  const [headIdx, setHeadIdx] = useState(DEFAULT_HEAD);
  const [temperature, setTemperature] = useState(DEFAULT_TEMP);
  const [generating, setGenerating] = useState(false);
  const [filterToast, setFilterToast] = useState<string | null>(null);

  /* -------- Load model on mount + auto-run with default text ------ */
  const didAutoRun = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadModel((p) => {
          if (!cancelled) setStage({ kind: "loading", progress: p });
        });
        if (cancelled) return;
        setStage({ kind: "ready" });
        if (!didAutoRun.current) {
          didAutoRun.current = true;
          await runOn(DEFAULT_TEXT, /*isInitial*/ true);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setStage({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
    // runOn is stable enough for the lifecycle here; deliberately empty deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- Inference -------------------------------------------- */
  const runOn = useCallback(async (currentText: string, isInitial = false) => {
    const trimmed = currentText.trim();
    if (!trimmed) return;
    setInferring(true);
    try {
      const r = await runInference(currentText);
      setResult(r);
      if (isInitial) setOriginalText(currentText);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[TransformerExplorer] inference failed", e);
    } finally {
      setInferring(false);
    }
  }, []);

  function showFilterToast() {
    setFilterToast("Let's keep this school-appropriate — try a different prompt.");
  }

  // Auto-dismiss the filter toast after a few seconds.
  useEffect(() => {
    if (!filterToast) return;
    const t = setTimeout(() => setFilterToast(null), FILTER_TOAST_MS);
    return () => clearTimeout(t);
  }, [filterToast]);

  function handlePickTemplate(template: string) {
    setDraft(template);
    setFilterToast(null);
  }

  function handleRun() {
    if (isBlocked(draft)) {
      showFilterToast();
      return;
    }
    setText(draft);
    setOriginalText(draft);
    runOn(draft, true);
  }

  function handleReset() {
    setText(originalText);
    setDraft(originalText);
    runOn(originalText);
  }

  /* -------- Generate next token ----------------------------------- */
  const handleGenerate = useCallback(async () => {
    if (!result) return;
    if (isBlocked(text)) {
      showFilterToast();
      return;
    }
    setGenerating(true);
    try {
      const probs = softmaxWithTemperature(result.lastLogits, temperature);
      const tokenId = sampleFromDistribution(probs);
      const tokenText = await decodeTokenId(tokenId);
      const next = text + tokenText;
      setText(next);
      setDraft(next);
      await runOn(next);
    } finally {
      setGenerating(false);
    }
  }, [result, temperature, text, runOn]);

  /* -------- Derived: top-k under current temperature ------------- */
  const topPredictions = useMemo(async () => {
    if (!result) return null;
    const probs = softmaxWithTemperature(result.lastLogits, temperature);
    const top = topK(probs, TOP_K);
    const decoded = await Promise.all(
      top.map(async (t) => ({
        ...t,
        text: await decodeTokenId(t.index),
      }))
    );
    return decoded;
  }, [result, temperature]);

  // The async useMemo above resolves a promise; we hold the resolved value
  // in state so render is sync.
  const [resolvedTop, setResolvedTop] = useState<
    { index: number; prob: number; text: string }[] | null
  >(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const v = await topPredictions;
      if (alive) setResolvedTop(v);
    })();
    return () => {
      alive = false;
    };
  }, [topPredictions]);

  /* -------- Render ------------------------------------------------ */
  if (stage.kind === "loading") {
    return <LoadingPanel progress={stage.progress} />;
  }
  if (stage.kind === "error") {
    return <ErrorPanel message={stage.message} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Filter toast — appears above input when blocked content is detected */}
      {filterToast && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--neutral-900)",
          }}
        >
          {filterToast}
        </div>
      )}

      {/* Prompt template chips */}
      <PromptChips onPick={handlePickTemplate} />

      {/* Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={metaLabel}>INPUT TEXT</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          spellCheck={false}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--neutral-900)",
            background: "var(--neutral-0)",
            border: "1px solid var(--neutral-200)",
            borderRadius: 10,
            resize: "vertical",
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--neutral-200)")}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleRun}
            disabled={inferring || !draft.trim()}
            className="btn btn-primary btn-sm"
            style={{ minWidth: 90 }}
          >
            {inferring ? "Running…" : "Run"}
          </button>
          {text !== originalText && (
            <button onClick={handleReset} className="btn btn-ghost btn-sm">
              Reset to original
            </button>
          )}
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--neutral-500)",
              marginLeft: "auto",
            }}
          >
            {result
              ? `${result.tokens.length} tokens · vocab ${result.vocabSize.toLocaleString()}`
              : ""}
          </span>
        </div>
      </div>

      {result && (
        <>
          {/* Tokenization */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={metaLabel}>TOKENS</span>
            <Tokens tokens={result.tokens} />
          </div>

          {/* Attention */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={metaLabel}>ATTENTION</span>
              <span style={{ flex: 1 }} />
              <Dropdown
                label="Layer"
                value={layerIdx}
                count={12}
                onChange={setLayerIdx}
              />
              <Dropdown
                label="Head"
                value={headIdx}
                count={12}
                onChange={setHeadIdx}
              />
            </div>
            <AttentionGraph
              tokens={result.tokens}
              attention={result.attentions[layerIdx][headIdx]}
              source={result.attentionSource}
            />
          </div>

          {/* Predictions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={metaLabel}>NEXT-TOKEN PREDICTIONS — TOP {TOP_K}</span>
            <Predictions predictions={resolvedTop ?? []} />
          </div>

          {/* Temperature + Generate */}
          <Generate
            temperature={temperature}
            onTemperatureChange={setTemperature}
            onGenerate={handleGenerate}
            generating={generating || inferring}
          />

          {/* Embedding visualizer — lazy-loaded when scrolled into view */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 24,
              borderTop: "1px solid var(--neutral-200)",
            }}
          >
            <EmbeddingExplorer />
          </div>
        </>
      )}
    </div>
  );
}

/* =====================================================================
   Subcomponents
   ===================================================================== */

const metaLabel: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--neutral-500)",
  letterSpacing: 0.6,
};

function Dropdown({
  label,
  value,
  count,
  onChange,
}: {
  label: string;
  value: number;
  count: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={metaLabel}>{label.toUpperCase()}</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          padding: "4px 8px",
          border: "1px solid var(--neutral-200)",
          borderRadius: 6,
          background: "var(--neutral-0)",
          color: "var(--neutral-700)",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <option key={i} value={i}>
            {i + 1}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingPanel({ progress }: { progress: LoadProgress }) {
  const message = useMemo(() => {
    switch (progress.stage) {
      case "runtime":
        return "Loading ONNX Runtime…";
      case "download": {
        const pct = typeof progress.pct === "number" ? Math.round(progress.pct) : 0;
        const f = progress.file ? ` · ${progress.file}` : "";
        return `Downloading GPT-2 small (~250 MB fp16, one-time)… ${pct}%${f}`;
      }
      case "initializing":
        return "Initializing model…";
      case "ready":
        return "Ready";
    }
  }, [progress]);
  return (
    <div
      style={{
        padding: "28px 24px",
        background: "var(--neutral-50)",
        border: "1px dashed var(--neutral-300)",
        borderRadius: 10,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--neutral-700)",
        textAlign: "center",
        lineHeight: 1.55,
      }}
    >
      {message}
      {progress.stage === "download" && (
        <div
          style={{
            marginTop: 12,
            height: 4,
            width: "100%",
            background: "var(--neutral-100)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(2, Math.min(100, progress.pct ?? 0))}%`,
              background: "var(--accent)",
              transition: "width 200ms",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "var(--accent-subtle)",
        border: "1px solid var(--accent)",
        borderRadius: 10,
        fontSize: 13,
        color: "var(--neutral-900)",
        lineHeight: 1.55,
      }}
    >
      Couldn&rsquo;t load the model: {message}. Check your network connection
      and reload the page.
    </div>
  );
}

// Re-export a few types so component imports are stable
export type { AttentionSource, TokenInfo };
