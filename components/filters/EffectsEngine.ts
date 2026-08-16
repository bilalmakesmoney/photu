/**
 * EffectsEngine.ts
 *
 * Pure canvas-based image effects for every editor tab.
 * No external dependencies beyond the browser Canvas 2D API.
 */

/* =========================================================
   TYPES
========================================================= */

export type EffectResult = {
  image: string;
  width: number;
  height: number;
};

/* =========================================================
   HELPERS
========================================================= */

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function mkCanvas(
  w: number,
  h: number
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function toResult(c: HTMLCanvasElement): EffectResult {
  return {
    image: c.toDataURL("image/jpeg", 0.95),
    width: c.width,
    height: c.height,
  };
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Deterministic RNG so effects look the same between renders. */
function rng(seed: number) {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Two-pass box blur (horizontal → vertical). */
function boxBlur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  r: number
) {
  const out = new Uint8ClampedArray(data);
  // horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0,
        gg = 0,
        bb = 0,
        n = 0;
      for (let dx = -r; dx <= r; dx++) {
        const nx = Math.min(w - 1, Math.max(0, x + dx));
        const i = (y * w + nx) * 4;
        rr += data[i];
        gg += data[i + 1];
        bb += data[i + 2];
        n++;
      }
      const i = (y * w + x) * 4;
      out[i] = rr / n;
      out[i + 1] = gg / n;
      out[i + 2] = bb / n;
    }
  }
  const tmp = new Uint8ClampedArray(out);
  // vertical
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let rr = 0,
        gg = 0,
        bb = 0,
        n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy));
        const i = (ny * w + x) * 4;
        rr += tmp[i];
        gg += tmp[i + 1];
        bb += tmp[i + 2];
        n++;
      }
      const i = (y * w + x) * 4;
      out[i] = rr / n;
      out[i + 1] = gg / n;
      out[i + 2] = bb / n;
    }
  }
  return out;
}

/* =========================================================
   LUTs  — colour-grade the image via channel remapping
========================================================= */

export type LutName =
  | "y2k"
  | "vhs"
  | "kodak"
  | "fuji"
  | "cinema"
  | "dream";

export async function applyLut(
  source: string,
  name: LutName,
  intensity: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const a = intensity / 100;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    let nr = r,
      ng = g,
      nb = b;

    switch (name) {
      case "y2k":
        nr = r * 1.08 + 18;
        ng = g * 0.92;
        nb = b * 0.95 + 25;
        break;
      case "vhs": {
        const avg = (r + g + b) / 3;
        nr = lerp(r, avg, 0.25) * 0.88 + 5;
        ng = lerp(g, avg, 0.15) * 0.95;
        nb = lerp(b, avg, 0.1) + 25;
        break;
      }
      case "kodak":
        nr = r * 1.06 + 12;
        ng = g * 1.03 + 5;
        nb = b * 0.82;
        break;
      case "fuji":
        nr = r * 0.92;
        ng = g * 1.06 + 8;
        nb = b * 1.02 + 5;
        break;
      case "cinema":
        if (r + g + b < 384) {
          nr = r * 0.85;
          ng = g + 8;
          nb = b * 1.12 + 12;
        } else {
          nr = r * 1.1 + 10;
          ng = g * 1.02;
          nb = b * 0.85;
        }
        break;
      case "dream":
        nr = r * 0.95 + 30;
        ng = g * 0.92 + 25;
        nb = b * 0.98 + 35;
        break;
    }
    d[i] = clamp(lerp(r, nr, a));
    d[i + 1] = clamp(lerp(g, ng, a));
    d[i + 2] = clamp(lerp(b, nb, a));
  }
  ctx.putImageData(id, 0, 0);
  return toResult(c);
}

/* =========================================================
   EFFECTS — pixel-level analog / digital artefacts
========================================================= */

export type EffectName =
  | "grain"
  | "noise"
  | "chromaticAberration"
  | "glitch"
  | "pixelSort"
  | "vhsEffect";

export async function applyEffect(
  source: string,
  name: EffectName,
  intensity: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const a = intensity / 100;

  switch (name) {
    case "grain": {
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const rand = rng(42);
      const strength = 60 * a;
      for (let i = 0; i < d.length; i += 4) {
        const n = (rand() - 0.5) * strength;
        d[i] = clamp(d[i] + n);
        d[i + 1] = clamp(d[i + 1] + n);
        d[i + 2] = clamp(d[i + 2] + n);
      }
      ctx.putImageData(id, 0, 0);
      break;
    }

    case "noise": {
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const rand = rng(77);
      const strength = 50 * a;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp(d[i] + (rand() - 0.5) * strength);
        d[i + 1] = clamp(d[i + 1] + (rand() - 0.5) * strength);
        d[i + 2] = clamp(d[i + 2] + (rand() - 0.5) * strength);
      }
      ctx.putImageData(id, 0, 0);
      break;
    }

    case "chromaticAberration": {
      const shift = Math.round(Math.max(2, w * 0.005 * a));
      const src = ctx.getImageData(0, 0, w, h);
      const dst = ctx.createImageData(w, h);
      const sd = src.data;
      const dd = dst.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          // red from left
          const rx = Math.max(0, Math.min(w - 1, x - shift));
          dd[i] = sd[(y * w + rx) * 4];
          // green center
          dd[i + 1] = sd[i + 1];
          // blue from right
          const bx = Math.max(0, Math.min(w - 1, x + shift));
          dd[i + 2] = sd[(y * w + bx) * 4 + 2];
          dd[i + 3] = 255;
        }
      }
      ctx.putImageData(dst, 0, 0);
      break;
    }

    case "glitch": {
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const rand = rng(99);
      const slices = Math.round(8 + 20 * a);
      for (let s = 0; s < slices; s++) {
        const yStart = Math.floor(rand() * h);
        const sliceH = Math.floor(rand() * (h * 0.06)) + 2;
        const offset = Math.floor((rand() - 0.5) * w * 0.15 * a);
        for (let y = yStart; y < Math.min(h, yStart + sliceH); y++) {
          const row = new Uint8ClampedArray(w * 4);
          for (let x = 0; x < w; x++) {
            const sx = Math.max(0, Math.min(w - 1, x - offset));
            const si = (y * w + sx) * 4;
            const di = x * 4;
            row[di] = d[si];
            row[di + 1] = d[si + 1];
            row[di + 2] = d[si + 2];
            row[di + 3] = 255;
          }
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i] = row[x * 4];
            d[i + 1] = row[x * 4 + 1];
            d[i + 2] = row[x * 4 + 2];
          }
        }
      }
      ctx.putImageData(id, 0, 0);
      break;
    }

    case "pixelSort": {
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const threshold = 80 + 120 * (1 - a);
      const rand = rng(123);
      for (let y = 0; y < h; y++) {
        if (rand() > 0.3 + 0.5 * a) continue;
        // find bright segments and sort them
        let segStart = -1;
        for (let x = 0; x <= w; x++) {
          const i = (y * w + x) * 4;
          const lum =
            x < w
              ? d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
              : 0;
          if (lum > threshold && x < w) {
            if (segStart < 0) segStart = x;
          } else if (segStart >= 0) {
            // sort segment by luminance
            const pixels: number[][] = [];
            for (let sx = segStart; sx < x; sx++) {
              const si = (y * w + sx) * 4;
              pixels.push([d[si], d[si + 1], d[si + 2]]);
            }
            pixels.sort(
              (pa, pb) =>
                pa[0] * 0.299 +
                pa[1] * 0.587 +
                pa[2] * 0.114 -
                (pb[0] * 0.299 + pb[1] * 0.587 + pb[2] * 0.114)
            );
            for (let k = 0; k < pixels.length; k++) {
              const si = (y * w + (segStart + k)) * 4;
              d[si] = pixels[k][0];
              d[si + 1] = pixels[k][1];
              d[si + 2] = pixels[k][2];
            }
            segStart = -1;
          }
        }
      }
      ctx.putImageData(id, 0, 0);
      break;
    }

    case "vhsEffect": {
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      const rand = rng(55);
      // scanlines
      for (let y = 0; y < h; y++) {
        if (y % 3 === 0) {
          const darken = 0.7 + 0.3 * (1 - a);
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i] = d[i] * darken;
            d[i + 1] = d[i + 1] * darken;
            d[i + 2] = d[i + 2] * darken;
          }
        }
      }
      // horizontal colour bleed
      const bleed = Math.round(3 * a);
      if (bleed > 0) {
        for (let y = 0; y < h; y++) {
          for (let x = w - 1; x >= bleed; x--) {
            const i = (y * w + x) * 4;
            const si = (y * w + (x - bleed)) * 4;
            d[i] = clamp(d[i] * 0.6 + d[si] * 0.4);
          }
        }
      }
      // tracking noise band
      const bandY = Math.floor(rand() * h * 0.8);
      const bandH = Math.floor(h * 0.04 * a) + 2;
      for (let y = bandY; y < Math.min(h, bandY + bandH); y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const n = (rand() - 0.5) * 80 * a;
          d[i] = clamp(d[i] + n);
          d[i + 1] = clamp(d[i + 1] + n);
          d[i + 2] = clamp(d[i + 2] + n);
        }
      }
      ctx.putImageData(id, 0, 0);
      break;
    }
  }
  return toResult(c);
}

/* =========================================================
   BLOOM — glow on bright areas
========================================================= */

export type BloomName =
  | "bloomIntensity"
  | "glow"
  | "softness"
  | "highlights";

export async function applyBloom(
  source: string,
  name: BloomName,
  intensity: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const a = intensity / 100;

  // Config per bloom type
  let threshold = 180;
  let blurRadius = Math.max(3, Math.round(Math.min(w, h) * 0.012));
  let strength = 0.5;
  let softFocus = false;

  switch (name) {
    case "bloomIntensity":
      threshold = 170;
      strength = 0.5 * a;
      break;
    case "glow":
      threshold = 120;
      blurRadius = Math.max(5, Math.round(Math.min(w, h) * 0.02));
      strength = 0.7 * a;
      break;
    case "softness":
      threshold = 100;
      strength = 0.4 * a;
      softFocus = true;
      break;
    case "highlights":
      threshold = 210;
      strength = 0.8 * a;
      break;
  }

  const src = ctx.getImageData(0, 0, w, h);

  // Downsample for blur performance
  const scale = 4;
  const sw = Math.max(1, Math.floor(w / scale));
  const sh = Math.max(1, Math.floor(h / scale));
  const [sc, sctx] = mkCanvas(sw, sh);
  sctx.drawImage(c, 0, 0, sw, sh);
  const small = sctx.getImageData(0, 0, sw, sh);

  // Extract bright pixels
  const bright = new Uint8ClampedArray(small.data);
  for (let i = 0; i < bright.length; i += 4) {
    const lum =
      bright[i] * 0.299 +
      bright[i + 1] * 0.587 +
      bright[i + 2] * 0.114;
    if (lum < threshold) {
      bright[i] = bright[i + 1] = bright[i + 2] = 0;
    }
  }

  // Multi-pass blur
  let blurred = bright;
  const passes = 3;
  const r = Math.max(1, Math.round(blurRadius / scale));
  for (let p = 0; p < passes; p++) {
    blurred = boxBlur(blurred, sw, sh, r);
  }

  // Upscale blurred glow
  sctx.putImageData(new ImageData(blurred, sw, sh), 0, 0);
  const [gc, gctx] = mkCanvas(w, h);
  gctx.imageSmoothingEnabled = true;
  gctx.drawImage(sc, 0, 0, w, h);
  const glowData = gctx.getImageData(0, 0, w, h);

  // Composite (screen blend)
  const sd = src.data;
  const gd = glowData.data;
  for (let i = 0; i < sd.length; i += 4) {
    sd[i] = clamp(
      sd[i] + gd[i] * strength - (sd[i] * gd[i] * strength) / 255
    );
    sd[i + 1] = clamp(
      sd[i + 1] +
        gd[i + 1] * strength -
        (sd[i + 1] * gd[i + 1] * strength) / 255
    );
    sd[i + 2] = clamp(
      sd[i + 2] +
        gd[i + 2] * strength -
        (sd[i + 2] * gd[i + 2] * strength) / 255
    );
  }

  // Optional soft focus (blur the whole image slightly)
  if (softFocus) {
    const softR = Math.max(1, Math.round(Math.min(w, h) * 0.002 * a));
    const softened = boxBlur(sd, w, h, softR);
    for (let i = 0; i < sd.length; i += 4) {
      sd[i] = lerp(sd[i], softened[i], 0.35 * a);
      sd[i + 1] = lerp(sd[i + 1], softened[i + 1], 0.35 * a);
      sd[i + 2] = lerp(sd[i + 2], softened[i + 2], 0.35 * a);
    }
  }

  ctx.putImageData(src, 0, 0);
  return toResult(c);
}

/* =========================================================
   PRESETS — chained multi-effect combinations
========================================================= */

export type PresetName =
  | "windows95"
  | "y2kPreset"
  | "cyber2000"
  | "disposableCamera"
  | "vhsTape"
  | "dreamcore";

export async function applyPreset(
  source: string,
  name: PresetName,
  intensity: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const a = intensity / 100;
  const rand = rng(333);

  switch (name) {
    case "windows95": {
      // Posterize + green tint + dither noise
      const levels = Math.round(lerp(32, 8, a));
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp(
          lerp(
            d[i],
            Math.round(d[i] / levels) * levels,
            a
          )
        );
        d[i + 1] = clamp(
          lerp(
            d[i + 1],
            Math.round(d[i + 1] / levels) * levels + 6 * a,
            a
          )
        );
        d[i + 2] = clamp(
          lerp(
            d[i + 2],
            Math.round(d[i + 2] / levels) * levels,
            a
          )
        );
        const n = (rand() - 0.5) * 18 * a;
        d[i] = clamp(d[i] + n);
        d[i + 1] = clamp(d[i + 1] + n);
        d[i + 2] = clamp(d[i + 2] + n);
      }
      break;
    }

    case "y2kPreset": {
      // Pink/magenta grade + grain + lifted blacks
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i] * 1.08 + 18 * a;
        let g = d[i + 1] * 0.92;
        let b = d[i + 2] * 0.95 + 25 * a;
        // lift blacks
        r = lerp(r, Math.max(r, 30), a);
        g = lerp(g, Math.max(g, 20), a);
        b = lerp(b, Math.max(b, 35), a);
        // grain
        const n = (rand() - 0.5) * 25 * a;
        d[i] = clamp(lerp(d[i], r + n, a));
        d[i + 1] = clamp(lerp(d[i + 1], g + n, a));
        d[i + 2] = clamp(lerp(d[i + 2], b + n, a));
      }
      break;
    }

    case "cyber2000": {
      // High saturation + chromatic + teal/pink
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
        let r = lerp(avg, d[i], 1 + 0.5 * a) + 15 * a;
        let g = lerp(avg, d[i + 1], 1 + 0.3 * a);
        let b = lerp(avg, d[i + 2], 1 + 0.5 * a) + 20 * a;
        d[i] = clamp(lerp(d[i], r, a));
        d[i + 1] = clamp(lerp(d[i + 1], g, a));
        d[i + 2] = clamp(lerp(d[i + 2], b, a));
      }
      break;
    }

    case "disposableCamera": {
      // Warm Kodak grade + grain + date stamp
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i] * 1.06 + 12 * a;
        let g = d[i + 1] * 1.03 + 5 * a;
        let b = d[i + 2] * 0.82;
        const n = (rand() - 0.5) * 30 * a;
        d[i] = clamp(lerp(d[i], r + n, a));
        d[i + 1] = clamp(lerp(d[i + 1], g + n, a));
        d[i + 2] = clamp(lerp(d[i + 2], b + n, a));
      }
      ctx.putImageData(id, 0, 0);
      // date stamp
      const fontSize = Math.max(12, Math.round(w * 0.03));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = `rgba(255,140,0,${0.8 * a})`;
      ctx.fillText("2000/01/01", w - fontSize * 7, h - fontSize * 0.8);
      return toResult(c);
    }

    case "vhsTape": {
      // Desaturated blue + scanlines + bleed + tracking noise
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
        let r = lerp(d[i], avg, 0.25 * a) * (1 - 0.12 * a) + 5 * a;
        let g = lerp(d[i + 1], avg, 0.15 * a) * (1 - 0.05 * a);
        let b = lerp(d[i + 2], avg, 0.1 * a) + 25 * a;
        d[i] = clamp(lerp(d[i], r, a));
        d[i + 1] = clamp(lerp(d[i + 1], g, a));
        d[i + 2] = clamp(lerp(d[i + 2], b, a));
      }
      // scanlines
      for (let y = 0; y < h; y++) {
        if (y % 3 === 0) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i] *= 0.75;
            d[i + 1] *= 0.75;
            d[i + 2] *= 0.75;
          }
        }
      }
      // tracking band
      const bandY = Math.floor(rand() * h * 0.7);
      for (let y = bandY; y < Math.min(h, bandY + h * 0.04); y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const n = (rand() - 0.5) * 60 * a;
          d[i] = clamp(d[i] + n);
          d[i + 1] = clamp(d[i + 1] + n);
          d[i + 2] = clamp(d[i + 2] + n);
        }
      }
      break;
    }

    case "dreamcore": {
      // Pastel grade + lifted blacks + soft glow inline
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i] * 0.95 + 30 * a;
        let g = d[i + 1] * 0.92 + 25 * a;
        let b = d[i + 2] * 0.98 + 35 * a;
        // lift blacks
        r = Math.max(r, 40 * a);
        g = Math.max(g, 35 * a);
        b = Math.max(b, 50 * a);
        // reduce contrast
        r = lerp(128, r, 1 - 0.2 * a);
        g = lerp(128, g, 1 - 0.2 * a);
        b = lerp(128, b, 1 - 0.2 * a);
        d[i] = clamp(lerp(d[i], r, a));
        d[i + 1] = clamp(lerp(d[i + 1], g, a));
        d[i + 2] = clamp(lerp(d[i + 2], b, a));
      }
      break;
    }
  }

  ctx.putImageData(id, 0, 0);
  return toResult(c);
}

/* =========================================================
   PATTERNS — repeating overlay textures
========================================================= */

export type PatternName =
  | "checkerboard"
  | "dots"
  | "grid"
  | "stars"
  | "noisePattern"
  | "pixelPattern";

export async function applyPattern(
  source: string,
  name: PatternName,
  intensity: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const a = intensity / 100;

  // Draw pattern on overlay canvas, then composite
  const [ov, octx] = mkCanvas(w, h);

  switch (name) {
    case "checkerboard": {
      const size = Math.max(8, Math.round(Math.min(w, h) * 0.025));
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
            octx.fillStyle = "rgba(0,0,0,0.15)";
          } else {
            octx.fillStyle = "rgba(255,255,255,0.1)";
          }
          octx.fillRect(x, y, size, size);
        }
      }
      break;
    }

    case "dots": {
      const spacing = Math.max(6, Math.round(Math.min(w, h) * 0.015));
      const r = spacing * 0.3;
      octx.fillStyle = "rgba(0,0,0,0.2)";
      for (let y = 0; y < h; y += spacing) {
        for (let x = 0; x < w; x += spacing) {
          octx.beginPath();
          octx.arc(x + spacing / 2, y + spacing / 2, r, 0, Math.PI * 2);
          octx.fill();
        }
      }
      break;
    }

    case "grid": {
      const spacing = Math.max(10, Math.round(Math.min(w, h) * 0.03));
      octx.strokeStyle = "rgba(0,0,0,0.15)";
      octx.lineWidth = 1;
      for (let x = 0; x < w; x += spacing) {
        octx.beginPath();
        octx.moveTo(x, 0);
        octx.lineTo(x, h);
        octx.stroke();
      }
      for (let y = 0; y < h; y += spacing) {
        octx.beginPath();
        octx.moveTo(0, y);
        octx.lineTo(w, y);
        octx.stroke();
      }
      break;
    }

    case "stars": {
      const rand = rng(777);
      const count = Math.round(40 + 80 * a);
      octx.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < count; i++) {
        const sx = rand() * w;
        const sy = rand() * h;
        const size = 2 + rand() * 6;
        drawStar(octx, sx, sy, size, 5);
      }
      break;
    }

    case "noisePattern": {
      const id = octx.createImageData(w, h);
      const d = id.data;
      const rand = rng(999);
      for (let i = 0; i < d.length; i += 4) {
        const v = rand() * 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 30;
      }
      octx.putImageData(id, 0, 0);
      break;
    }

    case "pixelPattern": {
      // Mosaic / pixelation
      const blockSize = Math.max(4, Math.round(Math.min(w, h) * 0.015 * a));
      const srcData = ctx.getImageData(0, 0, w, h);
      const sd = srcData.data;
      for (let by = 0; by < h; by += blockSize) {
        for (let bx = 0; bx < w; bx += blockSize) {
          let rr = 0, gg = 0, bb = 0, n = 0;
          for (let dy = 0; dy < blockSize && by + dy < h; dy++) {
            for (let dx = 0; dx < blockSize && bx + dx < w; dx++) {
              const i = ((by + dy) * w + (bx + dx)) * 4;
              rr += sd[i]; gg += sd[i + 1]; bb += sd[i + 2]; n++;
            }
          }
          octx.fillStyle = `rgb(${rr / n},${gg / n},${bb / n})`;
          octx.fillRect(bx, by, blockSize, blockSize);
        }
      }
      // For pixelPattern, draw directly and return
      ctx.globalAlpha = a;
      ctx.drawImage(ov, 0, 0);
      ctx.globalAlpha = 1;
      return toResult(c);
    }
  }

  ctx.globalAlpha = a;
  ctx.drawImage(ov, 0, 0);
  ctx.globalAlpha = 1;
  return toResult(c);
}

/** Draw a small star shape. */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  points: number
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/* =========================================================
   PHOTO SHAPES — clip the image to a shape
========================================================= */

export type ShapeName =
  | "circle"
  | "rounded"
  | "heart"
  | "shapeStar"
  | "diamond"
  | "polaroidShape";

export async function applyShape(
  source: string,
  name: ShapeName
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Create clip path
  ctx.save();
  ctx.beginPath();

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;

  switch (name) {
    case "circle":
      ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
      break;

    case "rounded": {
      const pad = Math.min(w, h) * 0.05;
      const radius = Math.min(w, h) * 0.08;
      roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, radius);
      break;
    }

    case "heart": {
      const s = r * 0.85;
      ctx.moveTo(cx, cy + s * 0.7);
      ctx.bezierCurveTo(
        cx - s * 1.2, cy - s * 0.2,
        cx - s * 0.7, cy - s * 1.0,
        cx, cy - s * 0.4
      );
      ctx.bezierCurveTo(
        cx + s * 0.7, cy - s * 1.0,
        cx + s * 1.2, cy - s * 0.2,
        cx, cy + s * 0.7
      );
      break;
    }

    case "shapeStar": {
      const points = 5;
      const outer = r * 0.9;
      const inner = r * 0.4;
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const rad = i % 2 === 0 ? outer : inner;
        const x = cx + Math.cos(angle) * rad;
        const y = cy + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }

    case "diamond":
      ctx.moveTo(cx, cy - r * 0.9);
      ctx.lineTo(cx + r * 0.9, cy);
      ctx.lineTo(cx, cy + r * 0.9);
      ctx.lineTo(cx - r * 0.9, cy);
      ctx.closePath();
      break;

    case "polaroidShape": {
      // Polaroid = full width, slightly inset, wider bottom
      const pad = Math.min(w, h) * 0.06;
      const bottomPad = Math.min(w, h) * 0.18;
      ctx.rect(pad, pad, w - pad * 2, h - pad - bottomPad);
      break;
    }
  }

  ctx.clip();
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  return toResult(c);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* =========================================================
   RETRO STAMPS — decorative vector shapes on the image
========================================================= */

export type StampName =
  | "cd"
  | "stampStar"
  | "flower"
  | "stampHeart"
  | "smile"
  | "y2kStamp";

export type StampPosition =
  | "center"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

export async function applyStamp(
  source: string,
  name: StampName,
  position: StampPosition,
  size: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);

  const s = Math.min(w, h) * (size / 100) * 0.3;
  let px = w / 2;
  let py = h / 2;
  const margin = s * 1.2;

  switch (position) {
    case "topLeft":
      px = margin; py = margin; break;
    case "topRight":
      px = w - margin; py = margin; break;
    case "bottomLeft":
      px = margin; py = h - margin; break;
    case "bottomRight":
      px = w - margin; py = h - margin; break;
  }

  ctx.save();
  ctx.translate(px, py);

  switch (name) {
    case "cd": {
      // Outer disc
      const grad = ctx.createRadialGradient(0, 0, s * 0.15, 0, 0, s);
      grad.addColorStop(0, "rgba(200,200,220,0.9)");
      grad.addColorStop(0.3, "rgba(180,120,255,0.7)");
      grad.addColorStop(0.6, "rgba(100,200,255,0.7)");
      grad.addColorStop(1, "rgba(180,180,200,0.8)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      // Center hole
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Shine lines
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * s * 0.2, Math.sin(angle) * s * 0.2);
        ctx.lineTo(Math.cos(angle) * s * 0.9, Math.sin(angle) * s * 0.9);
        ctx.stroke();
      }
      break;
    }

    case "stampStar": {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
      grad.addColorStop(0, "rgba(255,255,0,0.9)");
      grad.addColorStop(1, "rgba(255,140,0,0.8)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? s : s * 0.4;
        const x = Math.cos(angle) * rad;
        const y = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(200,100,0,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }

    case "flower": {
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const angle = (i * Math.PI * 2) / petals;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = `hsla(${(i * 60) % 360}, 80%, 70%, 0.7)`;
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.5, s * 0.3, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // center
      ctx.fillStyle = "rgba(255,220,0,0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "stampHeart": {
      ctx.fillStyle = "rgba(255,50,80,0.8)";
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 0.6, -s * 0.1, -s * 0.35, -s * 0.5, 0, -s * 0.2);
      ctx.bezierCurveTo(s * 0.35, -s * 0.5, s * 0.6, -s * 0.1, 0, s * 0.35);
      ctx.fill();
      break;
    }

    case "smile": {
      // Face
      ctx.fillStyle = "rgba(255,220,0,0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,150,0,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Eyes
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.beginPath();
      ctx.arc(-s * 0.25, -s * 0.15, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.25, -s * 0.15, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.35, 0.1, Math.PI - 0.1);
      ctx.stroke();
      break;
    }

    case "y2kStamp": {
      const fontSize = Math.max(12, s * 0.7);
      ctx.font = `bold ${fontSize}px "Arial Black", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Shadow
      ctx.fillStyle = "rgba(255,0,200,0.7)";
      ctx.fillText("Y2K", 3, 3);
      // Main
      ctx.fillStyle = "rgba(0,200,255,0.85)";
      ctx.fillText("Y2K", 0, 0);
      // Stars around
      ctx.fillStyle = "rgba(255,255,0,0.8)";
      drawStar(ctx, -s * 0.8, -s * 0.3, s * 0.15, 5);
      drawStar(ctx, s * 0.8, -s * 0.2, s * 0.12, 5);
      drawStar(ctx, s * 0.5, s * 0.4, s * 0.1, 5);
      break;
    }
  }

  ctx.restore();
  return toResult(c);
}

/* =========================================================
   OVERLAYS — procedural analog textures
========================================================= */

export type OverlayName =
  | "filmDust"
  | "lightLeak"
  | "flash"
  | "scratches"
  | "crt"
  | "vhsOverlay";

export async function applyOverlay(
  source: string,
  name: OverlayName,
  intensity: number
): Promise<EffectResult> {
  const img = await loadImg(source);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const [c, ctx] = mkCanvas(w, h);
  ctx.drawImage(img, 0, 0);
  const a = intensity / 100;

  switch (name) {
    case "filmDust": {
      const rand = rng(444);
      const count = Math.round(200 * a);
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const size = rand() * 3 + 0.5;
        const bright = rand() > 0.5;
        ctx.fillStyle = bright
          ? `rgba(255,255,255,${0.3 + rand() * 0.5})`
          : `rgba(0,0,0,${0.2 + rand() * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Hair-thin scratches
      ctx.strokeStyle = `rgba(255,255,255,${0.15 * a})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 5 * a; i++) {
        const x = rand() * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (rand() - 0.5) * 20, h);
        ctx.stroke();
      }
      break;
    }

    case "lightLeak": {
      // Warm gradient from corner
      const grad = ctx.createRadialGradient(
        w * 0.85, h * 0.15, 0,
        w * 0.85, h * 0.15, Math.max(w, h) * 0.8
      );
      grad.addColorStop(0, `rgba(255,180,50,${0.6 * a})`);
      grad.addColorStop(0.3, `rgba(255,100,50,${0.3 * a})`);
      grad.addColorStop(0.6, `rgba(255,50,100,${0.15 * a})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Second leak from other side
      const grad2 = ctx.createRadialGradient(
        w * 0.1, h * 0.9, 0,
        w * 0.1, h * 0.9, Math.max(w, h) * 0.6
      );
      grad2.addColorStop(0, `rgba(255,200,100,${0.3 * a})`);
      grad2.addColorStop(0.5, `rgba(255,100,200,${0.1 * a})`);
      grad2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      break;
    }

    case "flash": {
      // White radial from center
      const grad = ctx.createRadialGradient(
        w / 2, h / 2, 0,
        w / 2, h / 2, Math.max(w, h) * 0.7
      );
      grad.addColorStop(0, `rgba(255,255,255,${0.6 * a})`);
      grad.addColorStop(0.3, `rgba(255,255,240,${0.25 * a})`);
      grad.addColorStop(0.7, `rgba(255,255,255,${0.05 * a})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      break;
    }

    case "scratches": {
      const rand = rng(555);
      const count = Math.round(10 + 30 * a);
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const startY = rand() * h * 0.3;
        const endY = h - rand() * h * 0.3;
        ctx.strokeStyle = `rgba(255,255,255,${0.08 + rand() * 0.15 * a})`;
        ctx.lineWidth = rand() * 1.5 + 0.3;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        // Slight wobble
        const mid = (startY + endY) / 2;
        ctx.quadraticCurveTo(
          x + (rand() - 0.5) * 8,
          mid,
          x + (rand() - 0.5) * 4,
          endY
        );
        ctx.stroke();
      }
      break;
    }

    case "crt": {
      // Scanlines
      const id = ctx.getImageData(0, 0, w, h);
      const d = id.data;
      for (let y = 0; y < h; y++) {
        if (y % 3 === 0) {
          const darken = 1 - 0.25 * a;
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            d[i] *= darken;
            d[i + 1] *= darken;
            d[i + 2] *= darken;
          }
        }
      }
      // Vignette (darken corners)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x / w - 0.5) * 2;
          const dy = (y / h - 0.5) * 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const vig = 1 - Math.max(0, (dist - 0.7) * 1.5) * a;
          const i = (y * w + x) * 4;
          d[i] *= vig;
          d[i + 1] *= vig;
          d[i + 2] *= vig;
        }
      }
      ctx.putImageData(id, 0, 0);
      // RGB sub-pixel simulation
      ctx.globalAlpha = 0.04 * a;
      ctx.globalCompositeOperation = "screen";
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = "red";
        ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = "green";
        ctx.fillRect(0, y + 1, w, 1);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, y + 2, w, 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      break;
    }

    case "vhsOverlay": {
      const rand = rng(666);
      // Tracking lines at random positions
      for (let i = 0; i < 3; i++) {
        const y = Math.floor(rand() * h);
        const lineH = Math.floor(rand() * (h * 0.03 * a)) + 1;
        ctx.fillStyle = `rgba(255,255,255,${0.08 * a})`;
        ctx.fillRect(0, y, w, lineH);
      }
      // Static noise band
      const bandY = Math.floor(rand() * h * 0.8);
      const bandH = Math.floor(h * 0.05 * a) + 2;
      const noiseId = ctx.getImageData(0, bandY, w, Math.min(bandH, h - bandY));
      const nd = noiseId.data;
      for (let i = 0; i < nd.length; i += 4) {
        const n = (rand() - 0.5) * 100 * a;
        nd[i] = clamp(nd[i] + n);
        nd[i + 1] = clamp(nd[i + 1] + n);
        nd[i + 2] = clamp(nd[i + 2] + n);
      }
      ctx.putImageData(noiseId, 0, bandY);
      // Colour separation (slight red/blue offset)
      const shift = Math.round(2 * a);
      if (shift > 0) {
        const full = ctx.getImageData(0, 0, w, h);
        const fd = full.data;
        for (let y2 = 0; y2 < h; y2++) {
          for (let x2 = 0; x2 < w; x2++) {
            const i = (y2 * w + x2) * 4;
            const rx = Math.min(w - 1, x2 + shift);
            fd[i] = fd[(y2 * w + rx) * 4]; // shift red right
          }
        }
        ctx.putImageData(full, 0, 0);
      }
      break;
    }
  }
  return toResult(c);
}

/* =========================================================
   FRAMES — decorative borders around the image
   (outward expansion — image content is preserved)
========================================================= */

export type FrameName =
  | "film"
  | "polaroidFrame"
  | "windowsFrame"
  | "y2kFrame"
  | "disposableFrame"
  | "classicFrame";

export async function applyFrame(
  source: string,
  name: FrameName
): Promise<EffectResult> {
  const img = await loadImg(source);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const unit = Math.max(8, Math.round(Math.min(iw, ih) * 0.04));

  switch (name) {
    case "film": {
      const border = unit * 2;
      const fw = iw + border * 2;
      const fh = ih;
      const [c, ctx] = mkCanvas(fw, fh);
      // Black film strips
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, fw, fh);
      // Image in center
      ctx.drawImage(img, border, 0);
      // Sprocket holes
      const holeR = unit * 0.35;
      const spacing = unit * 1.5;
      ctx.fillStyle = "#333";
      for (let y = spacing / 2; y < fh; y += spacing) {
        // Left side
        ctx.beginPath();
        ctx.arc(border / 2, y, holeR, 0, Math.PI * 2);
        ctx.fill();
        // Right side
        ctx.beginPath();
        ctx.arc(fw - border / 2, y, holeR, 0, Math.PI * 2);
        ctx.fill();
      }
      return toResult(c);
    }

    case "polaroidFrame": {
      const pad = unit * 1.5;
      const bottomPad = unit * 4;
      const fw = iw + pad * 2;
      const fh = ih + pad + bottomPad;
      const [c, ctx] = mkCanvas(fw, fh);
      // White card
      ctx.fillStyle = "#f5f0e8";
      ctx.fillRect(0, 0, fw, fh);
      // Subtle shadow
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = unit;
      ctx.shadowOffsetX = unit * 0.3;
      ctx.shadowOffsetY = unit * 0.3;
      ctx.drawImage(img, pad, pad);
      ctx.shadowColor = "transparent";
      // Thin border around image
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.strokeRect(pad - 1, pad - 1, iw + 2, ih + 2);
      return toResult(c);
    }

    case "windowsFrame": {
      const titleH = unit * 2;
      const borderW = unit * 0.5;
      const bottomH = unit * 0.8;
      const fw = iw + borderW * 2;
      const fh = ih + titleH + borderW + bottomH;
      const [c, ctx] = mkCanvas(fw, fh);
      // Outer raised border
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(0, 0, fw, fh);
      // Win95 bevels
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, fh); ctx.lineTo(0, 0); ctx.lineTo(fw, 0);
      ctx.stroke();
      ctx.strokeStyle = "#404040";
      ctx.beginPath();
      ctx.moveTo(fw, 0); ctx.lineTo(fw, fh); ctx.lineTo(0, fh);
      ctx.stroke();
      // Title bar
      const grad = ctx.createLinearGradient(borderW, 0, fw - borderW, 0);
      grad.addColorStop(0, "#000080");
      grad.addColorStop(1, "#1084d0");
      ctx.fillStyle = grad;
      ctx.fillRect(borderW, borderW, fw - borderW * 2, titleH);
      // Title text
      const fontSize = Math.max(10, titleH * 0.6);
      ctx.font = `bold ${fontSize}px "MS Sans Serif", Arial, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      ctx.fillText("image95.exe", borderW + 6, borderW + titleH / 2);
      // Window buttons
      const btnS = titleH * 0.65;
      const btnY = borderW + (titleH - btnS) / 2;
      for (let b = 0; b < 3; b++) {
        const bx = fw - borderW - (3 - b) * (btnS + 3) - 3;
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(bx, btnY, btnS, btnS);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, btnY, btnS, btnS);
        ctx.strokeStyle = "#404040";
        ctx.beginPath();
        ctx.moveTo(bx + btnS, btnY);
        ctx.lineTo(bx + btnS, btnY + btnS);
        ctx.lineTo(bx, btnY + btnS);
        ctx.stroke();
        // Button symbols
        ctx.fillStyle = "#000";
        ctx.font = `bold ${btnS * 0.6}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const symbols = ["_", "□", "×"];
        ctx.fillText(symbols[b], bx + btnS / 2, btnY + btnS / 2);
      }
      ctx.textAlign = "start";
      // Image
      ctx.drawImage(img, borderW, borderW + titleH);
      return toResult(c);
    }

    case "y2kFrame": {
      const pad = unit * 2;
      const fw = iw + pad * 2;
      const fh = ih + pad * 2;
      const [c, ctx] = mkCanvas(fw, fh);
      // Gradient border
      const grad = ctx.createLinearGradient(0, 0, fw, fh);
      grad.addColorStop(0, "#ff69b4");
      grad.addColorStop(0.3, "#8b5cf6");
      grad.addColorStop(0.6, "#00bfff");
      grad.addColorStop(1, "#ff69b4");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fw, fh);
      // Stars scattered on frame
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      const rand = rng(2000);
      for (let i = 0; i < 30; i++) {
        const x = rand() * fw;
        const y = rand() * fh;
        // Only draw in border area
        if (x > pad && x < fw - pad && y > pad && y < fh - pad) continue;
        drawStar(ctx, x, y, 3 + rand() * 5, 5);
      }
      // Image
      ctx.drawImage(img, pad, pad);
      return toResult(c);
    }

    case "disposableFrame": {
      const pad = unit * 1.2;
      const bottomExtra = unit * 2;
      const fw = iw + pad * 2;
      const fh = ih + pad * 2 + bottomExtra;
      const [c, ctx] = mkCanvas(fw, fh);
      // Dark green frame
      ctx.fillStyle = "#2d3a2e";
      ctx.fillRect(0, 0, fw, fh);
      // Rounded inner cut for image
      ctx.save();
      const r = unit;
      ctx.beginPath();
      roundRect(ctx, pad, pad, iw, ih, r);
      ctx.clip();
      ctx.drawImage(img, pad, pad);
      ctx.restore();
      // Date stamp
      const fontSize = Math.max(10, unit * 0.8);
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = "#ff8c00";
      ctx.textAlign = "right";
      ctx.fillText(
        "'00  01  01",
        fw - pad,
        fh - bottomExtra / 2 + fontSize / 3
      );
      ctx.textAlign = "start";
      return toResult(c);
    }

    case "classicFrame": {
      const outer = unit * 0.8;
      const gap = unit * 0.4;
      const inner = unit * 1.2;
      const total = outer + gap + inner;
      const fw = iw + total * 2;
      const fh = ih + total * 2;
      const [c, ctx] = mkCanvas(fw, fh);
      // Matte background
      ctx.fillStyle = "#f0ead6";
      ctx.fillRect(0, 0, fw, fh);
      // Outer border
      ctx.strokeStyle = "#8b7355";
      ctx.lineWidth = outer;
      ctx.strokeRect(
        outer / 2, outer / 2,
        fw - outer, fh - outer
      );
      // Inner border
      const inX = outer + gap;
      ctx.strokeStyle = "#a0885c";
      ctx.lineWidth = inner;
      ctx.strokeRect(
        inX + inner / 2, inX + inner / 2,
        fw - (inX + inner / 2) * 2, fh - (inX + inner / 2) * 2
      );
      // Image
      ctx.drawImage(img, total, total);
      return toResult(c);
    }
  }

  // Fallback (should not reach)
  const [c, ctx] = mkCanvas(iw, ih);
  ctx.drawImage(img, 0, 0);
  return toResult(c);
}

/* =========================================================
   MAIN DISPATCHER
========================================================= */

export async function applyTabEffect(
  source: string,
  tab: string,
  effectName: string,
  intensity: number,
  options?: {
    stampPosition?: StampPosition;
    stampSize?: number;
  }
): Promise<EffectResult> {
  switch (tab) {
    case "LUTs":
      return applyLut(source, effectName as LutName, intensity);
    case "Effects":
      return applyEffect(source, effectName as EffectName, intensity);
    case "Bloom":
      return applyBloom(source, effectName as BloomName, intensity);
    case "Presets":
      return applyPreset(source, effectName as PresetName, intensity);
    case "Patterns":
      return applyPattern(source, effectName as PatternName, intensity);
    case "Photo Shapes":
      return applyShape(source, effectName as ShapeName);
    case "Retro Stamps":
      return applyStamp(
        source,
        effectName as StampName,
        options?.stampPosition ?? "bottomRight",
        options?.stampSize ?? 50
      );
    case "Overlays":
      return applyOverlay(source, effectName as OverlayName, intensity);
    case "Frames":
      return applyFrame(source, effectName as FrameName);
    default:
      throw new Error(`Unknown tab: ${tab}`);
  }
}

/** Whether a tab's effects support an intensity slider. */
export function tabHasIntensity(tab: string): boolean {
  return ![
    "Photo Shapes",
    "Frames",
  ].includes(tab);
}

/** Whether a tab is a stamp tab (needs position/size). */
export function tabIsStamp(tab: string): boolean {
  return tab === "Retro Stamps";
}
