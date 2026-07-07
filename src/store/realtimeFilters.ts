/** Build a PocketBase filter for `field = "value"`. */
export const pbEqFilter = (field: string, value: string): string =>
  `${field} = "${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
