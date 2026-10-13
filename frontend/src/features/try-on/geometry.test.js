import { describe, it, expect } from "vitest";
import {
  mapLandmarkToCanvas, coverTransform, similarityFromShoulders,
  validateShoulders, smoothTransform, extractShoulders, isStale,
} from "./geometry";
import { validateGarmentMeta } from "./poseAdapter";

describe("cover mapping", () => {
  it("centers a 16:9 video in a square viewport (letterbox offsets)", () => {
    const t = coverTransform(1280, 720, 500, 500);
    expect(t.scale).toBeCloseTo(500 / 720);
    expect(t.offX).toBeCloseTo((500 - 1280 * (500 / 720)) / 2);
  });
  it("mirrors once: left landmark appears on right", () => {
    const a = mapLandmarkToCanvas({ x: 0.2, y: 0.5 }, 100, 100, 200, 200, true);
    const b = mapLandmarkToCanvas({ x: 0.2, y: 0.5 }, 100, 100, 200, 200, false);
    expect(a.x).toBeCloseTo(200 - b.x);
    expect(a.y).toBeCloseTo(b.y);
  });
});

describe("similarity transform", () => {
  it("maps known shoulder pairs to expected scale/rotation/translation", () => {
    const A = { x: 0, y: 0 }, B = { x: 100, y: 0 };
    const P = { x: 10, y: 20 }, Q = { x: 110, y: 20 }; // same span, translated
    const t = similarityFromShoulders(A, B, P, Q);
    expect(t.s).toBeCloseTo(1);
    expect(t.theta).toBeCloseTo(0);
    expect(t.tx).toBeCloseTo(10);
    expect(t.ty).toBeCloseTo(20);
  });
  it("doubles scale when body span is 2x garment span", () => {
    const t = similarityFromShoulders({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(t.s).toBeCloseTo(2);
  });
  it("rejects degenerate garment anchors", () => {
    expect(similarityFromShoulders({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeNull();
  });
});

describe("tracking guards", () => {
  it("rejects low shoulder visibility", () => {
    expect(validateShoulders({ x: 10, y: 10 }, { x: 100, y: 10 }, 0.2, 0.9, 500).ok).toBe(false);
  });
  it("rejects tiny spans", () => {
    expect(validateShoulders({ x: 10, y: 10 }, { x: 15, y: 10 }, 0.9, 0.9, 500).reason).toBe("span-too-small");
  });
  it("hides stale overlay after 300ms", () => {
    expect(isStale(0, 301)).toBe(true);
    expect(isStale(0, 299)).toBe(false);
  });
  it("smoothing resets when no previous transform", () => {
    const n = { s: 1.2, theta: 0.1, tx: 5, ty: 6 };
    expect(smoothTransform(null, n, 33)).toEqual(n);
  });
  it("extracts MediaPipe shoulders 11/12", () => {
    const lms = Array.from({ length: 33 }, (_, i) => ({ x: i / 33, y: 0.5, visibility: 0.9 }));
    const s = extractShoulders(lms);
    expect(s.L.x).toBeCloseTo(11 / 33);
    expect(s.R.x).toBeCloseTo(12 / 33);
  });
});

describe("garment asset validation", () => {
  const good = { schema_version: 1, anchors: { left_shoulder: { x: 0.28, y: 0.18 }, right_shoulder: { x: 0.72, y: 0.18 }, hem_center: { x: 0.5, y: 0.88 } }, calibration: { scale_multiplier: 1.0 } };
  it("accepts valid metadata", () => expect(validateGarmentMeta(good)).toBeNull());
  it("rejects zero shoulder span", () => {
    const bad = { ...good, anchors: { ...good.anchors, right_shoulder: { x: 0.28, y: 0.18 } } };
    expect(validateGarmentMeta(bad)).toMatch(/span/i);
  });
});
