import { describe, it, expect } from "vitest";
import {
  affineFromTriangles, applyAffine, hemTarget, extractHips, smoothPoints,
  similarityFromShoulders, HEM_STRETCH_MAX,
} from "./geometry";
import { meanLuma, brightnessForLuma, LIGHT_MIN, LIGHT_MAX } from "./lighting";
import { garmentMatrix } from "./renderer";

const close = (p, q) => { expect(p.x).toBeCloseTo(q.x, 4); expect(p.y).toBeCloseTo(q.y, 4); };

describe("affine torso fit", () => {
  it("maps all three source points onto their targets", () => {
    const src = [{ x: 600, y: 100 }, { x: 400, y: 100 }, { x: 500, y: 600 }];
    const dst = [{ x: 330, y: 210 }, { x: 210, y: 200 }, { x: 290, y: 520 }];
    const m = affineFromTriangles(src, dst);
    src.forEach((p, i) => close(applyAffine(m, p), dst[i]));
  });
  it("rejects degenerate (collinear) source", () => {
    expect(affineFromTriangles([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }])).toBeNull();
  });
  it("without hips the hem equals the similarity prediction", () => {
    const A = { x: 600, y: 100 }, B = { x: 400, y: 100 }, H = { x: 500, y: 600 };
    const P = { x: 300, y: 200 }, Q = { x: 200, y: 200 };
    const sim = similarityFromShoulders(A, B, P, Q);
    close(hemTarget(sim, H, P, Q, null), { x: 250, y: 450 });
  });
  it("hips steer the hem but stretch and lean are clamped", () => {
    const A = { x: 600, y: 100 }, B = { x: 400, y: 100 }, H = { x: 500, y: 600 };
    const P = { x: 300, y: 200 }, Q = { x: 200, y: 200 };
    const sim = similarityFromShoulders(A, B, P, Q);
    const far = hemTarget(sim, H, P, Q, { x: 250, y: 2000 });
    expect(far.y - 200).toBeCloseTo(250 * HEM_STRETCH_MAX, 3);
    const sideways = hemTarget(sim, H, P, Q, { x: 900, y: 210 });
    expect(Math.atan2(sideways.x - 250, sideways.y - 200)).toBeLessThan(0.45);
  });
  it("ignores low-visibility or out-of-frame hips", () => {
    const lms = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
    expect(extractHips(lms)).not.toBeNull();
    lms[23] = { x: 0.6, y: 1.3, visibility: 0.9 };
    expect(extractHips(lms)).toBeNull();
    lms[23] = { x: 0.6, y: 0.8, visibility: 0.2 };
    expect(extractHips(lms)).toBeNull();
  });
  it("point smoothing moves partway and resets on shape change", () => {
    const s = smoothPoints([{ x: 0, y: 0 }], [{ x: 10, y: 0 }], 100, 100);
    expect(s[0].x).toBeGreaterThan(0);
    expect(s[0].x).toBeLessThan(10);
    expect(smoothPoints(null, [{ x: 1, y: 2 }], 16)).toEqual([{ x: 1, y: 2 }]);
  });
  it("similarity fallback matches old behaviour when no hem anchor", () => {
    const px = { A: { x: 600, y: 100 }, B: { x: 400, y: 100 } };
    const m = garmentMatrix(px, { P: { x: 300, y: 200 }, Q: { x: 200, y: 200 } }, null);
    close(applyAffine(m, px.A), { x: 300, y: 200 });
  });
  it("calibration scale is applied about the shoulder midpoint on the affine path", () => {
    const px = { A: { x: 600, y: 100 }, B: { x: 400, y: 100 }, H: { x: 500, y: 600 } };
    const dst = [{ x: 300, y: 200 }, { x: 200, y: 200 }, { x: 250, y: 450 }];
    const m = garmentMatrix(px, { P: dst[0], Q: dst[1], dst }, { scale: 1.1, offsetX: 0, offsetY: 0 });
    close(applyAffine(m, px.H), { x: 250, y: 200 + 250 * 1.1 });
  });
});

describe("light matching", () => {
  it("averages luma and skips transparent pixels", () => {
    const d = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]);
    expect(meanLuma(d)).toBeCloseTo(1);
  });
  it("clamps brightness to a gentle range", () => {
    expect(brightnessForLuma(0.01)).toBe(LIGHT_MIN);
    expect(brightnessForLuma(1)).toBe(LIGHT_MAX);
    expect(brightnessForLuma(0.45)).toBeCloseTo(1);
  });
});
