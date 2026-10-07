import { Badge } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/admin";
import type { ContentStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ContentStatus }) {
  const tone = status === "published" ? "success" : status === "review" ? "accent" : "neutral";
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>;
}
