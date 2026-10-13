import { describe, it, expect, vi } from "vitest";
import { loadGarment, clearGarmentCache, anchorPoints, selectAssetForColor } from "./assetCache";

describe("asset cache", () => {
  it("caches by URL and clears", async () => {
    clearGarmentCache();
    const instances = [];
    vi.stubGlobal("Image", class {
      constructor() { instances.push(this); }
      set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); }
    });
    const a = loadGarment("https://x/g.png");
    const b = loadGarment("https://x/g.png");
    expect(a).toBe(b); // same promise, one network load
    await expect(a).resolves.toBe(instances[0]);
    expect(instances).toHaveLength(1);
    clearGarmentCache();
    vi.unstubAllGlobals();
  });

  it("resolves null when no URL configured", async () => {
    await expect(loadGarment("")).resolves.toBeNull();
  });
});

describe("anchor helpers", () => {
  it("maps normalized anchors to image pixels", () => {
    const anchors = { left_shoulder: { x: 0.25, y: 0.2 }, right_shoulder: { x: 0.75, y: 0.2 } };
    expect(anchorPoints(anchors, 1000, 500)).toEqual({ A: { x: 250, y: 100 }, B: { x: 750, y: 100 } });
  });
  it("selects the asset for a color or null", () => {
    const assets = [{ color_id: "c1", asset_url: "u" }];
    expect(selectAssetForColor(assets, "c1")).toEqual(assets[0]);
    expect(selectAssetForColor(assets, "c9")).toBeNull();
  });
});
