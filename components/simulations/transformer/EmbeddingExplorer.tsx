"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  findTokenId,
  loadCoords,
  loadEmbeddings,
  loadVocab,
  localProjection,
  nearestNeighbors,
  vectorArithmetic,
  vocabAt,
  type LoadProgress,
} from "@/lib/simulations/embedding-core";

// Bottom-of-page section. Lazy-loads coords + vocab when scrolled into
// view; lazy-loads the 77 MB fp16 embeddings on the first interaction
// that needs 768D math (search, arithmetic).

const NEIGHBOR_COUNT = 30;
const PLOT_WIDTH = 640;
const PLOT_HEIGHT = 460;
const PLOT_PAD = 28;

type LoadState =
  | { kind: "idle" }
  | { kind: "loading-light" }
  | { kind: "ready-light" }
  | { kind: "loading-heavy"; progress: LoadProgress }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export function EmbeddingExplorer() {
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [searchTerm, setSearchTerm] = useState("king");
  const [searchedId, setSearchedId] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<{ id: number; sim: number }[]>([]);
  const [hoverId, setHoverId] = useState<number | null>(null);

  // Vector arithmetic state
  const [aWord, setAWord] = useState("king");
  const [bWord, setBWord] = useState("man");
  const [cWord, setCWord] = useState("woman");
  const [arithResult, setArithResult] = useState<
    { id: number; sim: number }[] | null
  >(null);
  const [arithError, setArithError] = useState<string | null>(null);

  /* -------- Lazy load when scrolled into view ----------------------- */
  const sectionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (load.kind !== "idle") return;
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          beginLightLoad();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.kind]);

  async function beginLightLoad() {
    setLoad({ kind: "loading-light" });
    try {
      await Promise.all([loadVocab(), loadCoords()]);
      setLoad({ kind: "ready-light" });
      // Kick off the heavy embedding download in the background so the
      // default "king" plot can show its neighbors without requiring a
      // click. Don't await — the section is interactive in light mode.
      void ensureHeavyLoaded();
    } catch (e) {
      setLoad({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function ensureHeavyLoaded() {
    if (load.kind === "ready") return;
    if (load.kind === "loading-heavy") return;
    setLoad({ kind: "loading-heavy", progress: { loaded: 0, total: 0 } });
    try {
      await loadEmbeddings((p) =>
        setLoad({ kind: "loading-heavy", progress: p })
      );
      setLoad({ kind: "ready" });
    } catch (e) {
      setLoad({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /* -------- Resolve initial "king" once vocab is loaded ----------- */
  useEffect(() => {
    if (load.kind === "ready-light" || load.kind === "ready") {
      // Only set if we haven't already.
      if (searchedId === null) {
        const id = findTokenId(searchTerm);
        if (id !== null) setSearchedId(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.kind]);

  /* -------- Compute neighbors when embeddings + searchedId ready -- */
  useEffect(() => {
    if (load.kind !== "ready") return;
    if (searchedId === null) return;
    setNeighbors(nearestNeighbors(searchedId, NEIGHBOR_COUNT));
  }, [load.kind, searchedId]);

  /* -------- Handle search submit ---------------------------------- */
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setSearchError(null);
    const id = findTokenId(searchTerm);
    if (id === null) {
      setSearchError(
        "GPT-2 splits this word into multiple tokens — try a more common word."
      );
      setSearchedId(null);
      setNeighbors([]);
      return;
    }
    setSearchedId(id);
    await ensureHeavyLoaded();
  }

  /* -------- Handle arithmetic ------------------------------------- */
  async function handleArith() {
    setArithError(null);
    setArithResult(null);
    const a = findTokenId(aWord);
    const b = findTokenId(bWord);
    const c = findTokenId(cWord);
    if (a === null || b === null || c === null) {
      const bad = [
        a === null ? aWord : null,
        b === null ? bWord : null,
        c === null ? cWord : null,
      ]
        .filter(Boolean)
        .join(", ");
      setArithError(
        `GPT-2 splits ${bad} into multiple tokens — try a more common word.`
      );
      return;
    }
    await ensureHeavyLoaded();
    const top = vectorArithmetic(a, b, c, 3);
    setArithResult(top);
  }

  /* -------- Local 2D projection -----------------------------------
   *
   * We compute PCA on just the 31 selected vectors (searched + 30
   * neighbors), not the global vocabulary. Global GPT-2 PCA captures
   * only ~2.6% of variance in PC1+PC2, so a tight cluster like "king
   * + its neighbors" collapses to a single dot. Local PCA chooses axes
   * that maximize variance WITHIN the cluster, so the points spread
   * out optimally. The math (n×n Gram matrix + power iteration) lives
   * in embedding-core; n ≈ 31 → milliseconds. */
  const localCoords = useMemo(() => {
    if (load.kind !== "ready") return null;
    if (searchedId === null) return null;
    if (neighbors.length === 0) return null;
    const ids = [searchedId, ...neighbors.map((n) => n.id)];
    return { ids, xy: localProjection(ids) };
  }, [load.kind, searchedId, neighbors]);

  const bounds = useMemo(() => {
    if (!localCoords) return null;
    const xy = localCoords.xy;
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < xy.length; i += 2) {
      const x = xy[i];
      const y = xy[i + 1];
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    const xpad = (xmax - xmin) * 0.12 || 1;
    const ypad = (ymax - ymin) * 0.12 || 1;
    return {
      xmin: xmin - xpad,
      xmax: xmax + xpad,
      ymin: ymin - ypad,
      ymax: ymax + ypad,
    };
  }, [localCoords]);

  function project(x: number, y: number): [number, number] {
    if (!bounds) return [PLOT_WIDTH / 2, PLOT_HEIGHT / 2];
    const w = PLOT_WIDTH - PLOT_PAD * 2;
    const h = PLOT_HEIGHT - PLOT_PAD * 2;
    const sx = PLOT_PAD + ((x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * w;
    const sy = PLOT_PAD + ((y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * h;
    return [sx, sy];
  }

  /** Coordinate lookup by token id, scoped to the current local layout.
   *  Returns null if the id isn't in the current cluster. */
  function localCoordsFor(id: number): [number, number] | null {
    if (!localCoords) return null;
    const idx = localCoords.ids.indexOf(id);
    if (idx < 0) return null;
    return [localCoords.xy[idx * 2], localCoords.xy[idx * 2 + 1]];
  }

  /* -------- Render --------------------------------------------- */
  return (
    <div
      ref={sectionRef}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--neutral-900)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          How does the model represent the meaning of a word?
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--neutral-700)",
            maxWidth: 720,
          }}
        >
          GPT-2 represents every word as a list of 768 numbers — its{" "}
          <em>embedding</em>. Words with similar meanings end up with similar
          number patterns, and the model figured this out on its own, just
          from reading text. Below, you&rsquo;re seeing a 2D map of that
          space — a shadow of the real 768-dimensional version. The model
          doesn&rsquo;t actually see words in 2D; it sees them in 768D. But
          the shadow still reveals real structure: similar words cluster, and
          you can do math on meanings.
        </p>
      </div>

      {/* Loading states for the section itself */}
      {load.kind === "loading-light" && (
        <LoadingBanner label="Loading embedding map…" pct={null} />
      )}
      {load.kind === "loading-heavy" && (
        <LoadingBanner
          label="Loading 768-D embeddings (~77 MB, one-time)…"
          pct={
            load.progress.total
              ? (load.progress.loaded / load.progress.total) * 100
              : null
          }
        />
      )}
      {load.kind === "error" && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--neutral-900)",
          }}
        >
          Couldn&rsquo;t load embeddings: {load.message}.
        </div>
      )}

      {(load.kind === "ready-light" ||
        load.kind === "loading-heavy" ||
        load.kind === "ready") && (
        <>
          {/* Search box */}
          <form
            onSubmit={handleSearch}
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--neutral-500)",
                letterSpacing: 0.6,
              }}
            >
              SEARCH WORD
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type any word to see how GPT-2 represents it."
              style={{
                flex: 1,
                minWidth: 220,
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--neutral-900)",
                background: "var(--neutral-0)",
                border: "1px solid var(--neutral-200)",
                borderRadius: 8,
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--neutral-200)")}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ minWidth: 80 }}
              disabled={load.kind === "loading-heavy"}
            >
              Show
            </button>
          </form>
          {searchError && (
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                color: "var(--neutral-700)",
                background: "var(--neutral-50)",
                border: "1px dashed var(--neutral-300)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {searchError}
            </div>
          )}

          {/* Scatter plot */}
          <ScatterPlot
            project={project}
            coordFor={localCoordsFor}
            searchedId={searchedId}
            neighbors={neighbors}
            hoverId={hoverId}
            onHover={setHoverId}
            heavyReady={load.kind === "ready"}
          />

          {/* Vector arithmetic */}
          <ArithmeticBlock
            aWord={aWord}
            bWord={bWord}
            cWord={cWord}
            onAChange={setAWord}
            onBChange={setBWord}
            onCChange={setCWord}
            onCompute={handleArith}
            error={arithError}
            result={arithResult}
            heavyLoading={load.kind === "loading-heavy"}
          />
        </>
      )}
    </div>
  );
}

/* =====================================================================
   Subcomponents
   ===================================================================== */

function LoadingBanner({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--neutral-50)",
        border: "1px dashed var(--neutral-300)",
        borderRadius: 10,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        color: "var(--neutral-700)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span>{pct === null ? label : `${label} ${pct.toFixed(0)}%`}</span>
      {pct !== null && (
        <div
          style={{
            height: 4,
            background: "var(--neutral-100)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(2, Math.min(100, pct))}%`,
              background: "var(--accent)",
              transition: "width 200ms",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ScatterPlot({
  project,
  coordFor,
  searchedId,
  neighbors,
  hoverId,
  onHover,
  heavyReady,
}: {
  project: (x: number, y: number) => [number, number];
  coordFor: (id: number) => [number, number] | null;
  searchedId: number | null;
  neighbors: { id: number; sim: number }[];
  hoverId: number | null;
  onHover: (id: number | null) => void;
  heavyReady: boolean;
}) {
  if (searchedId === null) {
    return (
      <div
        style={{
          padding: 14,
          background: "var(--neutral-50)",
          border: "1px dashed var(--neutral-300)",
          borderRadius: 10,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
          textAlign: "center",
        }}
      >
        type a word above to see its neighbors
      </div>
    );
  }
  // Searched word at the local cluster's center after PCA. Neighbors
  // around it. Color/opacity scale with similarity rank.
  const center = coordFor(searchedId);
  return (
    <div
      style={{
        background: "var(--cream, #faf6ee)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 8,
        overflow: "auto",
      }}
    >
      <svg
        width={PLOT_WIDTH}
        height={PLOT_HEIGHT}
        style={{ display: "block", maxWidth: "100%" }}
        viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
      >
        {!heavyReady && (
          <text
            x={PLOT_WIDTH / 2}
            y={PLOT_HEIGHT / 2}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={12}
            fill="var(--neutral-500)"
          >
            loading 768-D vectors…
          </text>
        )}
        {center && (
          <>
            {/* Neighbors — lines first, then circles, then labels */}
            {neighbors.map((n, rank) => {
              const co = coordFor(n.id);
              if (!co) return null;
              const [x, y] = project(co[0], co[1]);
              const [cx, cy] = project(center[0], center[1]);
              const hovered = hoverId === n.id;
              const dimByHover = hoverId !== null && !hovered;
              const palette = neighborPalette(rank, n.sim);
              return (
                <line
                  key={`l-${n.id}`}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={palette.line}
                  strokeWidth={hovered ? 2 : 1}
                  opacity={dimByHover ? 0.08 : palette.lineOpacity}
                />
              );
            })}
            {neighbors.map((n, rank) => {
              const co = coordFor(n.id);
              if (!co) return null;
              const [x, y] = project(co[0], co[1]);
              const hovered = hoverId === n.id;
              const dimByHover = hoverId !== null && !hovered;
              const palette = neighborPalette(rank, n.sim);
              return (
                <g key={`p-${n.id}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={hovered ? 6 : 4.5}
                    fill={palette.fill}
                    stroke="var(--cream, #faf6ee)"
                    strokeWidth={1.5}
                    opacity={dimByHover ? 0.3 : 1}
                    onMouseEnter={() => onHover(n.id)}
                    onMouseLeave={() => onHover(null)}
                    style={{ cursor: "pointer" }}
                  />
                  <text
                    x={x + 8}
                    y={y + 3}
                    fontFamily="var(--font-mono)"
                    fontSize={hovered ? 13 : 10.5}
                    fill={
                      hovered
                        ? "var(--neutral-900)"
                        : dimByHover
                        ? "var(--neutral-400)"
                        : palette.label
                    }
                    fontWeight={hovered ? 700 : 500}
                    style={{ pointerEvents: "none" }}
                  >
                    {renderToken(vocabAt(n.id))}
                  </text>
                </g>
              );
            })}
            {/* Searched word — large clay accent */}
            <circle
              cx={project(center[0], center[1])[0]}
              cy={project(center[0], center[1])[1]}
              r={8}
              fill="var(--accent)"
              stroke="var(--cream, #faf6ee)"
              strokeWidth={2}
            />
            <text
              x={project(center[0], center[1])[0] + 11}
              y={project(center[0], center[1])[1] + 4}
              fontFamily="var(--font-mono)"
              fontSize={15}
              fontWeight={700}
              fill="var(--accent)"
              style={{ pointerEvents: "none" }}
            >
              {renderToken(vocabAt(searchedId))}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/** Per-rank styling. Top neighbors are clay-accent, mid-rank are
 *  lab-cyan, low-rank fade to neutral. Lines are clay-tinted. */
function neighborPalette(rank: number, sim: number) {
  // Closer in cosine = darker line (more visible). Map sim ∈ ~[0.3, 0.9]
  // to opacity ∈ [0.18, 0.55].
  const lineOpacity = Math.max(0.18, Math.min(0.55, (sim - 0.25) * 0.9));
  if (rank < 5) {
    return {
      fill: "var(--accent)",
      label: "var(--neutral-900)",
      line: "var(--accent)",
      lineOpacity,
    };
  }
  if (rank < 15) {
    return {
      fill: "var(--lab-cyan)",
      label: "var(--neutral-800)",
      line: "var(--lab-cyan)",
      lineOpacity: lineOpacity * 0.85,
    };
  }
  return {
    fill: "var(--neutral-600)",
    label: "var(--neutral-700)",
    line: "var(--neutral-400)",
    lineOpacity: lineOpacity * 0.7,
  };
}

function ArithmeticBlock({
  aWord,
  bWord,
  cWord,
  onAChange,
  onBChange,
  onCChange,
  onCompute,
  error,
  result,
  heavyLoading,
}: {
  aWord: string;
  bWord: string;
  cWord: string;
  onAChange: (s: string) => void;
  onBChange: (s: string) => void;
  onCChange: (s: string) => void;
  onCompute: () => void;
  error: string | null;
  result: { id: number; sim: number }[] | null;
  heavyLoading: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
          letterSpacing: 0.6,
        }}
      >
        VECTOR ARITHMETIC
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 16,
        }}
      >
        <ArithInput value={aWord} onChange={onAChange} />
        <span style={{ color: "var(--neutral-500)" }}>−</span>
        <ArithInput value={bWord} onChange={onBChange} />
        <span style={{ color: "var(--neutral-500)" }}>+</span>
        <ArithInput value={cWord} onChange={onCChange} />
        <button
          onClick={onCompute}
          className="btn btn-primary btn-sm"
          style={{ minWidth: 60 }}
          disabled={heavyLoading}
        >
          =
        </button>
      </div>
      {error && (
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-700)",
            background: "var(--neutral-50)",
            border: "1px dashed var(--neutral-300)",
            borderRadius: 6,
            padding: "8px 12px",
          }}
        >
          {error}
        </div>
      )}
      {result && result.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {result.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "baseline",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}
            >
              <span
                style={{
                  fontWeight: i === 0 ? 700 : 500,
                  color: i === 0 ? "var(--accent)" : "var(--neutral-700)",
                  minWidth: 160,
                }}
              >
                {renderToken(vocabAt(r.id))}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--neutral-500)",
                }}
              >
                cos = {r.sim.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArithInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 110,
        padding: "6px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        color: "var(--neutral-900)",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 6,
        outline: "none",
        textAlign: "center",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--neutral-200)")}
    />
  );
}

function renderToken(text: string): string {
  if (text === "") return "∅";
  if (text === " ") return "·";
  if (text === "\n") return "↵";
  if (text.startsWith(" ")) return text.slice(1);
  return text;
}
