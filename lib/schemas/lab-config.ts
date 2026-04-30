// Lab config schema. Approved 2026-04-27. The single most load-bearing
// piece of architecture: every lesson is a config against this; the lab
// runtime mounts widgets per the discriminated union below.
//
// Motif enum aligned with MASTER_PLAN §7.1 "Activity motifs". Sessions
// without a §7.1-listed motif (1, 2, 3) omit the field.

import { z } from "zod";

/* ── Primitives ─────────────────────────────────────────────────────── */

const ContentRef = z
  .string()
  .describe('Path relative to the session folder, e.g. "lab/starter/session06.py"');

const ChannelName = z.string().regex(/^[a-z][a-zA-Z0-9_]*$/);

const WidgetId = z.string().regex(/^[a-z][a-zA-Z0-9_-]*$/);

const Placement = z
  .object({
    span: z.number().int().min(1).max(2).default(1),
    row: z.number().int().min(1).optional(),
    col: z.number().int().min(1).optional(),
  })
  .default(() => ({ span: 1 }));

const WidgetBase = z.object({
  id: WidgetId,
  title: z.string(),
  kicker: z.string().optional(),
  placement: Placement,
  publishes: z.array(ChannelName).default(() => []),
  subscribes: z.array(ChannelName).default(() => []),
  persist: z.boolean().default(false),
});

/* ── Widget kinds ───────────────────────────────────────────────────── */

const CodeCell = WidgetBase.extend({
  type: z.literal("code_cell"),
  language: z.literal("python").default("python"),
  starter: ContentRef.optional(),
  readonly: z.boolean().default(false),
  isolated: z.boolean().default(false),
  output: z.array(z.enum(["stdout", "value", "image", "data"])).default(["stdout", "value", "image"]),
  persist: z.boolean().default(true),
});

const Plot2D = WidgetBase.extend({
  type: z.literal("plot_2d"),
  mode: z.enum(["line", "scatter", "contour", "decision_boundary"]),
  interactions: z.array(z.enum(["click_add_point", "drag_handles", "drag_line"])).default([]),
  axes: z.object({
    x: z.object({ label: z.string(), domain: z.tuple([z.number(), z.number()]).optional() }),
    y: z.object({ label: z.string(), domain: z.tuple([z.number(), z.number()]).optional() }),
  }),
});

const Surface3D = WidgetBase.extend({
  type: z.literal("surface_3d"),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("preset"), preset: z.enum(["convex_bowl", "saddle", "rosenbrock", "mse_w_b"]) }),
    z.object({ kind: z.literal("channel"), channel: ChannelName }),
  ]),
  showHiker: z.boolean().default(false),
  trail: z.boolean().default(true),
});

const Sliders = WidgetBase.extend({
  type: z.literal("sliders"),
  controls: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      min: z.number(),
      max: z.number(),
      step: z.number(),
      initial: z.number(),
      color: z.enum(["lab-cyan", "lab-warm", "lab-teal"]).default("lab-cyan"),
      formatter: z.enum(["integer", "fixed1", "fixed2", "fixed3", "scientific"]).default("fixed3"),
      publishesAs: ChannelName.optional(),
    })
  ),
  actions: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        style: z.enum(["primary", "secondary"]).default("primary"),
        publishesAs: ChannelName.optional(),
      })
    )
    .default(() => []),
});

const NetworkBuilder = WidgetBase.extend({
  type: z.literal("network_builder"),
  inputDim: z.number().int().min(1),
  outputDim: z.number().int().min(1),
  allowedLayers: z.array(z.enum(["dense", "relu", "tanh", "sigmoid", "dropout"])),
  maxDepth: z.number().int().min(1).max(8).default(4),
  modelChannel: ChannelName.default("model"),
});

const Trainer = WidgetBase.extend({
  type: z.literal("trainer"),
  modelChannel: ChannelName,
  dataset: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("builtin"), name: z.enum(["xor", "two_moons", "spirals", "mnist_3class"]) }),
    z.object({ kind: z.literal("file"), path: ContentRef }),
  ]),
  hyperparams: z
    .object({
      epochs: z.number().int().default(50),
      batchSize: z.number().int().default(32),
      learningRate: z.number().default(0.01),
    })
    .default(() => ({ epochs: 50, batchSize: 32, learningRate: 0.01 })),
  emits: z
    .object({
      loss: ChannelName.optional(),
      accuracy: ChannelName.optional(),
      decisionBoundary: ChannelName.optional(),
      weights: ChannelName.optional(),
    })
    .default(() => ({})),
});

const WebcamCapture = WidgetBase.extend({
  type: z.literal("webcam_capture"),
  classes: z.array(z.string()).min(2).max(5),
  imagesPerClass: z.number().int().default(20),
  publishedAs: ChannelName.default("webcam_dataset"),
});

const DatasetViewer = WidgetBase.extend({
  type: z.literal("dataset_viewer"),
  source: ContentRef,
  features: z.array(z.string()).optional(),
  rowsPerPage: z.number().int().default(25),
  publishedAs: ChannelName.optional(),
});

const ImageGauntlet = WidgetBase.extend({
  type: z.literal("image_gauntlet"),
  manifest: ContentRef,
  showConfidence: z.boolean().default(true),
});

const FeatureToggles = WidgetBase.extend({
  type: z.literal("feature_toggles"),
  features: z.array(z.object({ key: z.string(), label: z.string() })),
  publishesAs: ChannelName.default("active_features"),
});

const FeatureViz = WidgetBase.extend({
  type: z.literal("feature_viz"),
  modelChannel: ChannelName,
  defaultLayer: z.number().int().default(1),
});

const BackpropAnimator = WidgetBase.extend({
  type: z.literal("backprop_animator"),
  modelChannel: ChannelName,
  exampleChannel: ChannelName,
  speed: z.enum(["step", "slow", "normal"]).default("step"),
});

const KMeansAnimator = WidgetBase.extend({
  type: z.literal("kmeans_animator"),
  k: z.number().int().min(2).max(8).default(3),
  pointsChannel: ChannelName.default("points"),
});

const EmbeddingExplorer = WidgetBase.extend({
  type: z.literal("embedding_explorer"),
  vocabulary: ContentRef,
  projection: z.enum(["pca", "tsne"]).default("pca"),
});

const AttentionViz = WidgetBase.extend({
  type: z.literal("attention_viz"),
  modelRef: z.string(),
  defaultSentence: z.string().optional(),
});

const SubmitPredictions = WidgetBase.extend({
  type: z.literal("submit_predictions"),
  predictionsChannel: ChannelName,
  endpoint: z.literal("/api/score"),
});

const MarkdownPanel = WidgetBase.extend({
  type: z.literal("markdown_panel"),
  source: ContentRef,
});

export const Widget = z.discriminatedUnion("type", [
  CodeCell,
  Plot2D,
  Surface3D,
  Sliders,
  NetworkBuilder,
  Trainer,
  WebcamCapture,
  DatasetViewer,
  ImageGauntlet,
  FeatureToggles,
  FeatureViz,
  BackpropAnimator,
  KMeansAnimator,
  EmbeddingExplorer,
  AttentionViz,
  SubmitPredictions,
  MarkdownPanel,
]);

/* ── Challenges ─────────────────────────────────────────────────────── */

export const Challenge = z.object({
  id: z.string(),
  prompt: z.string(),
  checker: ContentRef,
  // Hardcoded hints walked first; AI hint unlocks only after this list
  // is exhausted. Saves quota and gives faster feedback.
  hints: z.array(z.string()).default([]),
  hintContext: z.string().optional(),
  bossMode: z.boolean().default(false),
  harderVersion: z.string().optional(),
});

/* ── Top level ──────────────────────────────────────────────────────── */

export const MOTIFS = [
  "hiker",
  "neuron",
  "data_point",
  "decision_boundary",
  "cost_surface",
  "attention",
  "embedding",
  "training",
] as const;

export const LabConfig = z.object({
  version: z.literal(1),
  session: z.number().int().min(1).max(16),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  phase: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().positive(),
  motif: z.enum(MOTIFS).optional(),

  intro: ContentRef.optional(),

  layout: z
    .object({
      columns: z.number().int().min(1).max(3).default(2),
      gap: z.number().int().default(12),
    })
    .default(() => ({ columns: 2, gap: 12 })),

  widgets: z
    .array(Widget)
    .min(1)
    .superRefine((ws, ctx) => {
      const ids = new Set<string>();
      const published = new Set<string>();
      for (const w of ws) {
        if (ids.has(w.id))
          ctx.addIssue({ code: "custom", message: `duplicate widget id: ${w.id}` });
        ids.add(w.id);
        for (const ch of w.publishes ?? []) published.add(ch);
      }
      for (const w of ws) {
        for (const ch of w.subscribes ?? []) {
          if (!published.has(ch))
            ctx.addIssue({
              code: "custom",
              message: `widget ${w.id} subscribes to "${ch}" but no widget publishes it`,
            });
        }
      }
    }),

  challenges: z.array(Challenge).default([]),

  bossMode: z
    .object({
      enabled: z.boolean(),
      title: z.string().optional(),
      content: ContentRef.optional(),
    })
    .optional(),

  // v1.5 forward-compat. Runtime ignores until live class mode ships.
  instructorBroadcast: z
    .object({
      enabled: z.boolean(),
      broadcastChannels: z.array(ChannelName).default([]),
    })
    .optional(),
});

export type LabConfig = z.infer<typeof LabConfig>;
export type Widget = z.infer<typeof Widget>;
export type Challenge = z.infer<typeof Challenge>;

/* ── Checker contract ───────────────────────────────────────────────── */

export const CheckerInput = z.object({
  channels: z.record(z.string(), z.unknown()),
  cells: z.record(
    z.string(),
    z.object({ source: z.string(), lastOutput: z.unknown().optional() })
  ),
  attempt: z.number().int(),
});

export const CheckerResult = z.object({
  pass: z.boolean(),
  message: z.string(),
  detail: z.unknown().optional(),
  meta: z.record(z.string(), z.string()).optional(),
});

export type Checker = (input: z.infer<typeof CheckerInput>) => Promise<z.infer<typeof CheckerResult>>;
