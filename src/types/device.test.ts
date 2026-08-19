import { archForModel } from "./device";

test("710XP models are arm across SKU variants", () => {
  expect(archForModel("CCS-710XP-12TH-2S")).toBe("arm");
  expect(archForModel("CCS-710XP-28TNH")).toBe("arm");
  expect(archForModel("CCS-710XP-28TNH-2S-F")).toBe("arm");
});

test("non-710XP models are x86", () => {
  expect(archForModel("CCS-710P-16P")).toBe("x86");
  expect(archForModel("DCS-7050SX3-48YC8")).toBe("x86");
});

test("unknown or missing model falls back to x86", () => {
  expect(archForModel(null)).toBe("x86");
  expect(archForModel(undefined)).toBe("x86");
  expect(archForModel("")).toBe("x86");
});
