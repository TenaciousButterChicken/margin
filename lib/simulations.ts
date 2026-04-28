// Simulations registry — standalone interactive playgrounds, each
// focused on one ML idea. Lives alongside but separate from the 16
// session journey. Each sim eventually gets a route at /simulations/[slug];
// for now they're all "coming soon" placeholders.

import type { Phase } from "./sessions";

export type SimulationStatus = "coming_soon" | "live";

export type SimulationMeta = {
  slug: string;
  title: string;
  description: string;          // one line, sentence case, no period flourishes
  phase: Phase;                 // shows the audience "this maps to phase N of the course"
  attribution?: string;         // "Inspired by ..." — small footer line
  status: SimulationStatus;
};

export const SIMULATIONS: SimulationMeta[] = [
  {
    slug: "teachable-machine",
    title: "Teachable Machine",
    description: "Train an image classifier with your webcam in 30 seconds.",
    phase: 1,
    attribution: "Inspired by Google's Teachable Machine",
    status: "live",
  },
  {
    slug: "polynomial-playground",
    title: "Polynomial Playground",
    description: "Drag points, watch a curve fit them — see overfitting happen live.",
    phase: 2,
    attribution: "Built for Margin. Inspired by classic bias-variance demos.",
    status: "live",
  },
  {
    slug: "neural-net-playground",
    title: "Neural Net Playground",
    description: "Build and train a neural network in your browser. No setup.",
    phase: 3,
    attribution: "Inspired by Smilkov & Carter's TensorFlow Playground",
    status: "live",
  },
  {
    slug: "cnn-explorer",
    title: "CNN Explorer",
    description: "See what each layer of a vision model is looking at.",
    phase: 4,
    attribution: "Inspired by Wang et al.'s CNN Explainer (Polo Club, GA Tech)",
    status: "live",
  },
  {
    slug: "transformer-explorer",
    title: "Transformer Explorer",
    description: "Type a sentence. Watch attention flow between words in real time.",
    phase: 5,
    attribution: "Inspired by Cho et al.'s Transformer Explainer (Polo Club, GA Tech)",
    status: "live",
  },
  {
    slug: "diffusion-explorer",
    title: "Diffusion Explorer",
    description: "Add noise to an image, then watch the model un-noise it step by step.",
    phase: 5,
    attribution: "Inspired by Distill's diffusion explainers",
    status: "coming_soon",
  },
];

export function getSimulation(slug: string): SimulationMeta | undefined {
  return SIMULATIONS.find((s) => s.slug === slug);
}
