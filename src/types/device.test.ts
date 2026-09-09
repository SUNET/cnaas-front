import { archForModel, isArm, isCpuArchitecture } from "./device";

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

test("isCpuArchitecture recognizes backend enum names only", () => {
  expect(isCpuArchitecture("X86_32")).toBe(true);
  expect(isCpuArchitecture("X86_64")).toBe(true);
  expect(isCpuArchitecture("ARM64")).toBe(true);
  expect(isCpuArchitecture("aarch64")).toBe(false);
  expect(isCpuArchitecture(null)).toBe(false);
  expect(isCpuArchitecture(undefined)).toBe(false);
});

test("isArm is true only for ARM64", () => {
  expect(isArm("ARM64")).toBe(true);
  expect(isArm("X86_32")).toBe(false);
  expect(isArm("X86_64")).toBe(false);
});
