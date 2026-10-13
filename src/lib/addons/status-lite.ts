import type { AddonStatus } from "./entitlement";
import type { AddonStatusLite } from "@/components/tools/common";

/** Ubah status server (bisa Infinity) menjadi data aman untuk client. */
export function toLite(s: AddonStatus): AddonStatusLite {
  const { remaining: _r, ...rest } = s;
  void _r;
  return rest;
}
