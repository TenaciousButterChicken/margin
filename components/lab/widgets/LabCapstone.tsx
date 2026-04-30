// Beat 9 capstone view. Replaces the dual-panel grid + math strip with
// a single-column long-form study guide: bridges grade-9 y = mx + b to
// the 3D bowl, walks the gradient descent loop in numpy line-by-line,
// shows the same algorithm in PyTorch, contrasts with the closed-form
// solution, and closes with takeaways + cliffhanger to Phase 4.

import { Tex } from "./Tex";

export function LabCapstone() {
  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "8px 8px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <Section0Bridge />
      <Section1Numpy />
      <Section2PyTorch />
      <Section3ClosedForm />
      <Capstone />
    </div>
  );
}

/* ============================================================
   SECTION 0 - How a line becomes a bowl
   ============================================================ */
function Section0Bridge() {
  return (
    <SectionFrame
      kicker="0 of 4"
      title="How a line becomes a bowl"
      lede="The piece that makes everything you just did make sense."
    >
      <Prose>
        You learned <InlineMath tex="y = mx + b" /> in grade 9: slope{" "}
        <InlineMath tex="m" />, y-intercept <InlineMath tex="b" />. Two numbers,
        one line. In ML we just rename them - real models have thousands of
        weights, so calling everything <InlineMath tex="w" /> with subscripts
        scales:
      </Prose>

      <RenameTable />

      <Prose>
        So <InlineMath tex="y = mx + b" /> becomes{" "}
        <InlineMath tex="y = w_0 + w_1 x" />. Same equation. New names.
      </Prose>

      <Subhead>Loss for one dot</Subhead>
      <Prose>
        For a study-hours value <InlineMath tex="x" />, the line predicts:
      </Prose>
      <BlockMath tex="\hat{y} = w_0 + w_1 x" />
      <Prose>
        If the actual exam score was <InlineMath tex="y" />, the error is the
        difference. We square it so over-shooting and under-shooting both
        count as wrong:
      </Prose>
      <BlockMath tex="\text{squared error} = (\hat{y} - y)^2 = (w_0 + w_1 x - y)^2" />

      <Subhead>Loss across all 10 dots</Subhead>
      <Prose>
        Sum the squared errors and divide by N (= 10 in our dataset). That's
        the <Strong>mean squared error</Strong>, also called the{" "}
        <Strong>cost</Strong> or the <Strong>loss</Strong>:
      </Prose>
      <BlockMath tex="J(w_0, w_1) = \frac{1}{N} \sum_{i=1}^{N} (w_0 + w_1 x_i - y_i)^2" />
      <Prose>
        Notice what J depends on: <InlineMath tex="w_0" /> and{" "}
        <InlineMath tex="w_1" />. The two knobs of the line. Different settings
        produce different lines, which produce different errors, which produce
        different total cost.
      </Prose>

      <Subhead>Where the bowl came from</Subhead>
      <Prose>
        Plot J on a 3D graph: the floor is{" "}
        <InlineMath tex="(w_0, w_1)" /> and the height is{" "}
        <InlineMath tex="J(w_0, w_1)" />.
      </Prose>
      <Pullquote>
        Every point on the floor is one possible line. The height is how wrong
        that line is. The lowest point of the bowl is the line that fits the
        data best.
      </Pullquote>
      <Prose>
        That's the link Beat 2 hinted at and never spelled out:{" "}
        <Strong>
          the bowl IS <InlineMath tex="y = w_0 + w_1 x" /> plotted from a
          different angle.
        </Strong>{" "}
        Gradient descent walks downhill on the bowl. When it lands at the
        bottom, you have the line.
      </Prose>
    </SectionFrame>
  );
}

function RenameTable() {
  const rows: Array<[string, string, string]> = [
    ["b", "w_0", "the y-intercept (the line's height when x = 0)"],
    ["m", "w_1", "the slope (how much y changes per unit of x)"],
    ["x", "x", "the input (study hours)"],
    ["y", "y", "the output (exam score)"],
  ];
  return (
    <div
      style={{
        background: "var(--neutral-50)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "var(--neutral-100)" }}>
            <Th>grade 9</Th>
            <Th>ML</Th>
            <Th>what it is</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([g9, ml, what]) => (
            <tr key={g9} style={{ borderTop: "1px solid var(--neutral-200)" }}>
              <Td>
                <InlineMath tex={g9} />
              </Td>
              <Td>
                <InlineMath tex={ml} />
              </Td>
              <Td>{what}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   SECTION 1 - Your lab in numpy
   ============================================================ */
function Section1Numpy() {
  return (
    <SectionFrame
      kicker="1 of 4"
      title="Your lab in numpy"
      lede="The exact algorithm the hiker performed, in 12 lines of Python."
    >
      <Code>{`import numpy as np

# the data: study hours and exam scores, 10 students
X = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
y = np.array([58, 65, 73, 82, 90, 98, 107, 113, 122, 131])

# standardize so the bowl is round, not a stretched ravine
X_n = (X - X.mean()) / X.std()
y_n = (y - y.mean()) / y.std()

# initialize the hiker at (0, 0)
w0, w1 = 0.0, 0.0
lr = 0.08

# walk downhill 50 times
for step in range(50):
    pred  = w0 + w1 * X_n              # the line
    error = pred - y_n                 # how wrong each dot is
    g0 = (2/len(X)) * error.sum()              # gradient: w0 piece
    g1 = (2/len(X)) * (error * X_n).sum()      # gradient: w1 piece
    w0 -= lr * g0                      # w_new = w - lr * g
    w1 -= lr * g1`}</Code>

      <Subhead>1a - Setup: what is numpy, X, and y?</Subhead>
      <Prose>
        <Strong>numpy</Strong> is a Python library for fast math on lists of
        numbers. The <InlineCode>as np</InlineCode> at the top lets us write{" "}
        <InlineCode>np.array(...)</InlineCode> instead of{" "}
        <InlineCode>numpy.array(...)</InlineCode>.
      </Prose>
      <Prose>
        An <Strong>array</Strong> is a list of numbers stored in a way that
        lets you do math on the whole list at once. Plain Python:{" "}
        <InlineCode>[1, 2, 3] * 2</InlineCode> gives{" "}
        <InlineCode>[1, 2, 3, 1, 2, 3]</InlineCode> (concatenation, not what we
        want). Numpy: <InlineCode>np.array([1, 2, 3]) * 2</InlineCode> gives{" "}
        <InlineCode>[2, 4, 6]</InlineCode>. That's the whole point.
      </Prose>
      <Prose>
        <Strong>X</Strong> (capital) is the input. Convention is capital
        because in real ML, X can be a 2D table (many features, like study
        hours AND sleep hours AND practice problems). For us, just one column.{" "}
        <Strong>y</Strong> (lowercase) is the output - one number per student.
        Ten students total, so X and y both have 10 entries.
      </Prose>

      <Subhead>1b - Standardization: why we squish the data</Subhead>
      <Prose>
        <InlineCode>X_n = (X - X.mean()) / X.std()</InlineCode> subtracts the
        average X (so the new mean is 0) and divides by the standard deviation
        (so the new spread is 1). Same for y. The result: both X_n and y_n
        have a tidy range around zero.
      </Prose>
      <Prose>
        Why bother? Gradient descent works best when the inputs and outputs
        are on similar scales. Raw study hours (1-10) and raw exam scores
        (58-131) are wildly different - the cost surface gets stretched into a
        long, narrow ravine that's painful to walk. Standardizing makes the
        bowl <Strong>round</Strong>. That's why the bowl in the lab looked
        like a clean parabola and not a weird crevasse.
      </Prose>

      <Subhead>1c - Initialization: where the hiker starts</Subhead>
      <Prose>
        <InlineCode>w0, w1 = 0.0, 0.0</InlineCode> drops the hiker at the
        origin of the bowl. We could start anywhere - Beat 9 itself made the
        point that starting position doesn't matter on a convex bowl.
      </Prose>
      <Prose>
        <InlineCode>lr = 0.08</InlineCode> is the learning rate, the step
        size. Same number you saw locked in Beat 4. Beat 5 showed lr = 0.001
        was painfully slow. Beat 6 showed lr = 0.6 broke everything.
      </Prose>

      <Subhead>1d - The training loop: 50 hiker steps</Subhead>
      <Prose>
        <InlineCode>for step in range(50)</InlineCode>: do this 50 times. Each
        iteration is one click of the step button.
      </Prose>
      <Prose>
        <InlineCode>pred = w0 + w1 * X_n</InlineCode>: the line equation.
        Numpy applies it to all 10 inputs at once, so{" "}
        <InlineCode>pred</InlineCode> is an array of 10 predicted exam scores.
      </Prose>
      <Prose>
        <InlineCode>error = pred - y_n</InlineCode>: how wrong each prediction
        is. Array of 10 numbers. Some positive (we over-predicted), some
        negative (we under-predicted).
      </Prose>
      <Prose>
        <InlineCode>g0 = (2/len(X)) * error.sum()</InlineCode>: the gradient
        with respect to <InlineMath tex="w_0" />. This is the <Strong>height</Strong>{" "}
        piece of the gradient - exactly what Beat 4.6 called "how much do the
        dots want the line to shift up/down." The 2/N factor falls out of the
        calculus when you differentiate the squared-error formula.
      </Prose>
      <Prose>
        <InlineCode>g1 = (2/len(X)) * (error * X_n).sum()</InlineCode>: the
        gradient with respect to <InlineMath tex="w_1" />. The{" "}
        <Strong>tilt</Strong> piece. Same structure as g0, but each error gets
        multiplied by its X value first - because changing the slope affects
        each prediction proportionally to how far out on the x-axis it is.
      </Prose>
      <Prose>
        <InlineCode>w0 -= lr * g0</InlineCode> and{" "}
        <InlineCode>w1 -= lr * g1</InlineCode>: the step. This is the formula
        you watched assemble in Beat 4.7:{" "}
        <BlockMath tex="w_{\text{new}} = w - \mathit{lr} \cdot g" />
        Subtract because the gradient points uphill and we want to walk
        downhill.
      </Prose>
      <Prose>
        After 50 iterations, <InlineCode>w0</InlineCode> and{" "}
        <InlineCode>w1</InlineCode> are very close to the optimal values.
        That's the trained model.
      </Prose>
    </SectionFrame>
  );
}

/* ============================================================
   SECTION 2 - Same loop, real ML library
   ============================================================ */
function Section2PyTorch() {
  return (
    <SectionFrame
      kicker="2 of 4"
      title="Same loop, real ML library"
      lede="What every modern model actually uses. Same algorithm, different abstraction level."
    >
      <Code>{`import torch
import torch.optim as optim

optimizer = optim.SGD(model.parameters(), lr=0.08)

for step in range(50):
    pred = model(X)                    # whatever the model is
    loss = ((pred - y) ** 2).mean()    # mean squared error
    loss.backward()                    # compute gradients automatically
    optimizer.step()                   # w -= lr * g, for every weight
    optimizer.zero_grad()              # reset grads for next iteration`}</Code>

      <Subhead>2a - What is PyTorch?</Subhead>
      <Prose>
        PyTorch is a Python library used by every major AI lab to train
        models. Most published research models, most production systems, and
        the training pipelines for things like ChatGPT-style models all run on
        PyTorch (or close cousins).
      </Prose>
      <Prose>
        Its core trick: it watches every operation you do on its tensors, then
        when you call <InlineCode>loss.backward()</InlineCode>, it
        automatically computes the gradient of the loss with respect to every
        weight in the model. You never have to derive g0 and g1 by hand.
      </Prose>

      <Subhead>2b - The loop, line by line</Subhead>
      <Prose>
        <InlineCode>optim.SGD(...)</InlineCode>: <Strong>SGD</Strong> stands
        for Stochastic Gradient Descent. The "stochastic" part is a small
        tweak (use a random subset of dots each step instead of all of them) -
        the rest is identical to what you just did.
      </Prose>
      <Prose>
        <InlineCode>pred = model(X)</InlineCode>: in our lab,{" "}
        <InlineCode>model</InlineCode> would be{" "}
        <InlineCode>w0 + w1 * X</InlineCode>. In a neural network, it's
        millions of weights stacked into layers. The line of code is the same.
      </Prose>
      <Prose>
        <InlineCode>loss = ((pred - y) ** 2).mean()</InlineCode>: identical to
        the cost function in Section 0. Square the errors, take the mean.
      </Prose>
      <Prose>
        <InlineCode>loss.backward()</InlineCode>: this is the magic line.
        PyTorch traces backwards through every operation that produced{" "}
        <InlineCode>loss</InlineCode> and computes the gradient for every
        weight. For our linear model that's just g0 and g1 again. For GPT-4
        that's 175 billion gradients.
      </Prose>
      <Prose>
        <InlineCode>optimizer.step()</InlineCode>: applies{" "}
        <InlineCode>w -= lr * g</InlineCode> for every weight at once. The
        same line as Section 1. PyTorch just does it in a loop you don't have
        to write.
      </Prose>
      <Prose>
        <InlineCode>optimizer.zero_grad()</InlineCode>: housekeeping. PyTorch
        accumulates gradients by default; this zeroes them so the next
        iteration starts fresh.
      </Prose>

      <Subhead>2c - The takeaway</Subhead>
      <Pullquote>
        Same algorithm. Different abstraction level. This loop trains
        everything from linear regression to GPT. The only things that change
        are the model definition and the data.
      </Pullquote>
    </SectionFrame>
  );
}

/* ============================================================
   SECTION 3 - The closed-form footnote
   ============================================================ */
function Section3ClosedForm() {
  return (
    <SectionFrame
      kicker="3 of 4"
      title="The closed-form footnote"
      lede="Why we did the slow universal way instead of the fast specific way."
    >
      <Code>{`# linear regression has a one-line closed-form solution
import numpy as np

w = np.linalg.lstsq(X_n, y_n, rcond=None)[0]
# done. no iteration. faster than 50 hiker steps.`}</Code>

      <Subhead>3a - The fast specific way</Subhead>
      <Prose>
        <InlineCode>np.linalg.lstsq</InlineCode> stands for "least squares."
        Numpy has a built-in function that solves linear regression in one
        matrix equation. No bowl, no stepping, no learning rate to tune.
      </Prose>
      <Prose>
        Behind the scenes, it uses calculus directly: take the gradient of the
        cost function from Section 0, set it equal to zero, and solve the
        resulting equations algebraically. For squared-error linear regression
        this gives a clean closed-form answer (the "normal equations"). One
        line of numpy, milliseconds, done.
      </Prose>

      <Subhead>3b - So why did we walk down a bowl 50 times?</Subhead>
      <Prose>
        Because <Strong>closed-form solutions only exist for linear models</Strong>.
      </Prose>
      <Prose>
        Set the gradient of a neural network's loss equal to zero and try to
        solve algebraically: you can't. There's no neat formula. The math
        doesn't cooperate once you have non-linear activations stacked on top
        of each other. The same is true for tree models, transformers, and
        every other modern architecture.
      </Prose>
      <Prose>
        Even if a closed-form magically existed for GPT-4, it'd require
        building and inverting a matrix with{" "}
        <InlineCode>175,000,000,000^2</InlineCode> entries - more memory than
        exists on Earth, several times over. Gradient descent only ever needs
        one step at a time. That's why it scales.
      </Prose>

      <Subhead>3c - The lesson</Subhead>
      <Pullquote>
        You learned the slow, universal way - the way that trains every model
        in the world - instead of the fast, specific way that only fits lines.
      </Pullquote>
    </SectionFrame>
  );
}

/* ============================================================
   CAPSTONE - the whole lab in synthesis form
   ============================================================ */
function Capstone() {
  return (
    <SectionFrame
      kicker="4 of 4"
      title="What you actually learned"
      lede="The whole lab in one paragraph, three takeaways, and one cliffhanger."
      tone="capstone"
    >
      <Subhead>The whole lab in one paragraph</Subhead>
      <Prose>
        You started with a wonky line. The cost function said how wrong it
        was. The cost surface mapped every possible line to its wrongness, in
        3D. The gradient told you which way the surface tilts. Walking
        opposite the gradient, with a step size you tuned, found the line that
        fits the data best. That's gradient descent. That's the whole
        algorithm.
      </Prose>

      <Subhead>Three things to take with you</Subhead>
      <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        <li style={{ fontSize: 15, lineHeight: 1.6, color: "var(--neutral-900)" }}>
          <Strong>A cost function is just a number you minimize.</Strong> The
          same idea trains everything from linear regression to GPT - what
          changes is the model, not the loop.
        </li>
        <li style={{ fontSize: 15, lineHeight: 1.6, color: "var(--neutral-900)" }}>
          <Strong>The gradient and the learning rate are the only two knobs.</Strong>{" "}
          Get them right and everything works. Get one wrong and you get
          either chaos (Beat 6) or paint drying (Beat 5).
        </li>
        <li style={{ fontSize: 15, lineHeight: 1.6, color: "var(--neutral-900)" }}>
          <Strong>You don't need to see the bowl to walk down it.</Strong>{" "}
          That's the whole reason this works on a model with a billion weights
          where the bowl is unvisualizable.
        </li>
      </ul>

      <Subhead>What breaks next</Subhead>
      <Prose>
        Every bowl in this lab was <Strong>convex</Strong>: one bottom,
        smooth, gradient descent always finds it. Real model losses, like the
        ones you'll meet in Phase 4 (neural networks), are{" "}
        <Strong>non-convex</Strong> - thousands of pits, ridges, and saddle
        points. Gradient descent can fall into the wrong pit and stop. Phase 4
        starts with that problem.
      </Prose>
      <Prose>
        For now, click &ldquo;Finish lab.&rdquo; You earned it.
      </Prose>
    </SectionFrame>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */

function SectionFrame({
  kicker,
  title,
  lede,
  tone = "default",
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  tone?: "default" | "capstone";
  children: React.ReactNode;
}) {
  const isCapstone = tone === "capstone";
  return (
    <section
      style={{
        background: isCapstone ? "var(--accent-subtle)" : "var(--neutral-0)",
        border: `1px solid ${isCapstone ? "var(--accent)" : "var(--neutral-200)"}`,
        borderRadius: 12,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: isCapstone ? "var(--accent)" : "var(--neutral-500)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Section {kicker}
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            color: "var(--neutral-900)",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 14,
            color: "var(--neutral-700)",
            lineHeight: 1.5,
          }}
        >
          {lede}
        </p>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "8px 0 0",
        fontSize: 14,
        fontWeight: 700,
        color: "var(--neutral-900)",
      }}
    >
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 15,
        lineHeight: 1.65,
        color: "var(--neutral-900)",
      }}
    >
      {children}
    </p>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ fontWeight: 700, color: "var(--neutral-900)" }}>
      {children}
    </strong>
  );
}

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      style={{
        margin: 0,
        padding: "14px 18px",
        background: "var(--accent-subtle)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: "0 8px 8px 0",
        fontSize: 15,
        lineHeight: 1.6,
        color: "var(--neutral-900)",
        fontStyle: "italic",
      }}
    >
      {children}
    </blockquote>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: "16px 18px",
        background: "var(--neutral-50)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.55,
        color: "var(--neutral-900)",
        fontFamily: "var(--font-mono)",
        overflow: "auto",
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.9em",
        padding: "2px 6px",
        background: "var(--neutral-100)",
        borderRadius: 4,
        color: "var(--neutral-900)",
      }}
    >
      {children}
    </code>
  );
}

function InlineMath({ tex }: { tex: string }) {
  return <Tex tex={tex} />;
}

function BlockMath({ tex }: { tex: string }) {
  return (
    <div
      style={{
        padding: "10px 0",
        textAlign: "center",
      }}
    >
      <Tex tex={tex} display />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--neutral-500)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "10px 14px",
        fontSize: 14,
        color: "var(--neutral-900)",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
