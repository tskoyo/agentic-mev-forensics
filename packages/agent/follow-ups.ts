export type Verdict = "frontrun" | "unknown" | "normal" | "not checked" | "auto";

const FOLLOW_UPS: Record<Verdict, string[]> = {
  frontrun: ["Who ran that tx?", "Could I have won this?"],
  unknown: ["What else could explain this?", "How confident are you?"],
  normal: ["Show me the simulation details"],
  "not checked": [],
  auto: [],
};

export function verdictFollowUps(verdict: Verdict): string[] {
  return FOLLOW_UPS[verdict] ?? [];
}
