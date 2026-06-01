import { sanitizePermissions } from "./sanitizePermissions";

describe("sanitizePermissions", () => {
  test("returns null when the input is not an array", () => {
    expect(sanitizePermissions(null)).toBeNull();
    expect(sanitizePermissions(undefined)).toBeNull();
    expect(sanitizePermissions("admin")).toBeNull();
    expect(sanitizePermissions({ pages: ["Devices"] })).toBeNull();
  });

  test("keeps known string-array fields", () => {
    const result = sanitizePermissions([
      {
        methods: ["GET"],
        endpoints: ["/devices"],
        exclude_endpoints: ["/secret"],
        pages: ["Devices"],
        rights: ["read"],
      },
    ]);

    expect(result).toEqual([
      {
        methods: ["GET"],
        endpoints: ["/devices"],
        exclude_endpoints: ["/secret"],
        pages: ["Devices"],
        rights: ["read"],
      },
    ]);
  });

  test("strips unknown fields and non-string values", () => {
    const result = sanitizePermissions([
      {
        pages: ["Devices", 42, null, "Groups"],
        rights: "read",
        injected: "<script>alert(1)</script>",
      },
    ]);

    expect(result).toEqual([
      {
        methods: undefined,
        endpoints: undefined,
        exclude_endpoints: undefined,
        pages: ["Devices", "Groups"],
        rights: undefined,
      },
    ]);
    expect(result?.[0]).not.toHaveProperty("injected");
  });

  test("normalises non-object entries to empty permissions", () => {
    expect(sanitizePermissions(["nope", 1, null])).toEqual([
      {
        methods: undefined,
        endpoints: undefined,
        exclude_endpoints: undefined,
        pages: undefined,
        rights: undefined,
      },
      {
        methods: undefined,
        endpoints: undefined,
        exclude_endpoints: undefined,
        pages: undefined,
        rights: undefined,
      },
      {
        methods: undefined,
        endpoints: undefined,
        exclude_endpoints: undefined,
        pages: undefined,
        rights: undefined,
      },
    ]);
  });

  test("drops undefined fields when serialised for storage", () => {
    const result = sanitizePermissions([
      { pages: ["Devices"], rights: ["read"] },
    ]);

    expect(JSON.stringify(result)).toBe(
      '[{"pages":["Devices"],"rights":["read"]}]',
    );
  });
});
