#!/usr/bin/env python3
"""
Pre-extract GPT-2 small's input embedding matrix (wte: 50257 × 768) and
PCA-projected 2D coordinates, plus the vocab. The Transformer Explorer
embedding visualizer fetches these as static binaries from the Pi.

Run once. Outputs go to public/embeddings/.

  - gpt2-embeddings.fp16.bin   ~77 MB   raw fp16, row-major [50257, 768]
  - gpt2-coords-pca-2d.fp32.bin ~400 KB  raw fp32, row-major [50257, 2]
  - gpt2-vocab.json            ~700 KB  list of 50257 decoded token strings

Why pre-extract: transformers.js wraps weights inside an ONNX session and
doesn't expose them at runtime. The standard `wte` matrix lives in HF's
`gpt2/model.safetensors`. We download it once, slice out the wte tensor,
quantise to fp16 to halve the wire size, and ship that.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import requests
from safetensors import safe_open
from tokenizers import Tokenizer


REPO = "gpt2"
SAFETENSORS_URL = f"https://huggingface.co/{REPO}/resolve/main/model.safetensors"
TOKENIZER_URL   = f"https://huggingface.co/{REPO}/resolve/main/tokenizer.json"

WTE_TENSOR_NAME = "wte.weight"  # GPT2Model export — verified by inspecting the safetensors header

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "embeddings"
TMP_DIR = Path(__file__).resolve().parent / ".cache"


def fetch(url: str, dest: Path, expected_size_mb: int | None = None) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  cached: {dest.name} ({dest.stat().st_size/1e6:.1f} MB)")
        return
    print(f"  fetching {url}")
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    written = 0
    last = time.time()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 20):
            if not chunk:
                continue
            f.write(chunk)
            written += len(chunk)
            now = time.time()
            if now - last > 2:
                pct = (written / total * 100) if total else 0
                print(f"    {written/1e6:6.1f} MB  ({pct:5.1f}%)")
                last = now
    print(f"  saved: {dest.name} ({dest.stat().st_size/1e6:.1f} MB)")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    safetensors_path = TMP_DIR / "gpt2-model.safetensors"
    tokenizer_path = TMP_DIR / "gpt2-tokenizer.json"

    print("[1/4] download safetensors + tokenizer")
    fetch(SAFETENSORS_URL, safetensors_path)
    fetch(TOKENIZER_URL, tokenizer_path)

    print("[2/4] extract wte tensor")
    with safe_open(str(safetensors_path), framework="np") as f:
        names = list(f.keys())
        if WTE_TENSOR_NAME not in names:
            print(f"  ERROR: {WTE_TENSOR_NAME!r} not in safetensors. Available keys:")
            for n in names[:30]:
                print("   ", n)
            sys.exit(1)
        wte_fp32 = f.get_tensor(WTE_TENSOR_NAME)  # [50257, 768], float32
    print(f"  shape: {wte_fp32.shape}, dtype: {wte_fp32.dtype}")
    if wte_fp32.shape != (50257, 768):
        print(f"  ERROR: unexpected shape {wte_fp32.shape}")
        sys.exit(1)

    # Save fp16. fp16 fits the [-clip, clip] range of GPT-2 embeddings without
    # underflow — typical values are in [-3, 3].
    wte_fp16 = wte_fp32.astype(np.float16)
    out_emb = OUT_DIR / "gpt2-embeddings.fp16.bin"
    wte_fp16.tofile(out_emb)
    print(f"  wrote: {out_emb.name} ({out_emb.stat().st_size/1e6:.1f} MB)")

    print("[3/4] compute PCA 2D projection")
    # Center across rows (per-feature mean).
    mean = wte_fp32.mean(axis=0, keepdims=True)
    centered = wte_fp32 - mean
    # 768×768 covariance — small.
    cov = centered.T @ centered / (centered.shape[0] - 1)
    # Symmetric eigendecomposition. eigh returns ascending eigvals.
    eigvals, eigvecs = np.linalg.eigh(cov)
    top2 = eigvecs[:, -2:][:, ::-1]  # [768, 2], largest variance first
    coords = (centered @ top2).astype(np.float32)  # [50257, 2]
    print(f"  variance captured: PC1={eigvals[-1]/eigvals.sum():.3f}  PC2={eigvals[-2]/eigvals.sum():.3f}")
    out_coords = OUT_DIR / "gpt2-coords-pca-2d.fp32.bin"
    coords.tofile(out_coords)
    print(f"  wrote: {out_coords.name} ({out_coords.stat().st_size/1e3:.1f} KB)")

    print("[4/4] decode vocab")
    tok = Tokenizer.from_file(str(tokenizer_path))
    vocab_size = tok.get_vocab_size()
    if vocab_size != 50257:
        print(f"  WARNING: tokenizer vocab is {vocab_size}, expected 50257")
    # Decode each id individually so we get the human-readable form
    # (BPE 'Ġ' becomes a leading space, etc.).
    vocab: list[str] = []
    for i in range(50257):
        # Some ids may decode to "" (BPE artifacts). We keep them so the index
        # still matches the embedding row.
        vocab.append(tok.decode([i], skip_special_tokens=False))
    out_vocab = OUT_DIR / "gpt2-vocab.json"
    out_vocab.write_text(json.dumps(vocab, ensure_ascii=False))
    print(f"  wrote: {out_vocab.name} ({out_vocab.stat().st_size/1e3:.1f} KB)")

    print("\nDone. Files in:", OUT_DIR)


if __name__ == "__main__":
    main()
