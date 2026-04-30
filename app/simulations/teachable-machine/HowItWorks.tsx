"use client";

import { useState } from "react";

// Plain-English explainer that lives below the simulation. Collapsed by
// default. Avoids the words "vector," "tensor," "calculus," "convolution"
// - keeps the explanation honest but accessible.

export function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: "1px solid var(--neutral-200)",
        borderRadius: 10,
        background: "var(--neutral-0)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          font: "inherit",
          color: "var(--neutral-900)",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        <span>How this works</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--neutral-500)",
            fontSize: 12,
            transition: "transform 200ms",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 18px 18px",
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--neutral-700)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p style={{ margin: 0 }}>
            You&rsquo;re not training a model from scratch. That would take
            thousands of images and a long wait. Instead, this uses a trick
            called <strong>transfer learning</strong>:
          </p>
          <ol style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>
              <strong>Borrow a model someone else already trained.</strong>{" "}
              We&rsquo;re using <em>MobileNet</em>, which Google trained on
              millions of photos to recognize common objects (dogs, cars,
              keyboards, &hellip;). It downloaded once when you opened this page.
            </li>
            <li>
              <strong>Chop off its last layer.</strong> The last layer is
              MobileNet&rsquo;s &ldquo;is this a dog or a cat?&rdquo; voice, useless
              for your classes. The layer just before it produces a list of
              roughly a thousand numbers per frame. Those numbers describe
              what&rsquo;s in the picture, in MobileNet&rsquo;s internal
              vocabulary.
            </li>
            <li>
              <strong>Save the numbers when you record.</strong> Every time you
              hold &ldquo;Hold to record,&rdquo; we run the current frame through
              MobileNet, grab those thousand numbers, and store them with your
              class label.
            </li>
            <li>
              <strong>Look up the closest match when predicting.</strong> Each
              new frame goes through the same pipeline, and we ask: of all the
              examples the user just gave us, which ones are <em>nearest</em> to
              this in number-space? Whichever class has the most nearby
              neighbors wins. The technique is called{" "}
              <strong>k-nearest neighbors</strong> (KNN).
            </li>
          </ol>
          <p style={{ margin: 0 }}>
            That&rsquo;s why this works in 30 seconds: Google did the hard part
            (training MobileNet on millions of images), and you only need a
            handful of examples to teach the simple lookup on top.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--neutral-500)",
              padding: "10px 12px",
              background: "var(--neutral-50)",
              borderRadius: 6,
              borderLeft: "3px solid var(--lab-cyan)",
            }}
          >
            stack: TensorFlow.js (WebGL backend) → MobileNet v2 (depth
            multiplier 1.0) → KNN classifier (k=3 by default).
          </p>
        </div>
      )}
    </div>
  );
}
