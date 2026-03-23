import "@testing-library/jest-dom/vitest";

if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  crypto.randomUUID = () => `test-uuid-a-b-c-${Math.random()}` as `${string}-${string}-${string}-${string}-${string}`;
} else if (typeof crypto === "undefined") {
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: () => `test-uuid-a-b-c-${Math.random()}` as `${string}-${string}-${string}-${string}-${string}`,
    },
  });
}
