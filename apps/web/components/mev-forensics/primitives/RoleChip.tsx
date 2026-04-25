import { ROLE_STYLES } from "@/lib/styles";
import type { Role } from "@/lib/types";

interface Props {
  role: Role;
}

export function RoleChip({ role }: Props) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.router;
  return (
    <span
      className="inline-block rounded px-[7px] py-[2px] text-[11px] font-medium shrink-0"
      style={{ background: s.bg, color: s.text }}
    >
      {role}
    </span>
  );
}
