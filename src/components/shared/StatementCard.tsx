import { StatementCardProps } from "@/types";

export default function StatementCard(props: StatementCardProps) {
  return <div className="rounded border p-4">{props.statement.vyrok}</div>;
}
