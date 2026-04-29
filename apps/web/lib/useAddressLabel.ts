import type { Actor, Role } from "./types";

export interface AddressLabel {
  label: string | null;
  role: Role | null;
  truncated: string;
}

export function truncateAddress(addr: string): string {
  if (addr.includes("…")) return addr;
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useAddressLabel(address: string, actors: Actor[]): AddressLabel {
  const normalized = address.toLowerCase();
  const actor = actors.find(
    (a) =>
      a.addr.toLowerCase() === normalized ||
      (a.fullAddr && a.fullAddr.toLowerCase() === normalized),
  );

  return {
    label: actor?.label ?? null,
    role: actor?.role ?? null,
    truncated: truncateAddress(address),
  };
}
