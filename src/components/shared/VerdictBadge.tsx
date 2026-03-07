import { Verdict } from "@/types";

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className="text-sm font-medium">{verdict}</span>;
}
