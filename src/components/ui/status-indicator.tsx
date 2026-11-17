import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_MAP: Record<string, { tone: StatusTone; Icon: typeof CheckCircle2 }> = {
  // Orders
  Delivered: { tone: "success", Icon: CheckCircle2 },
  Shipped: { tone: "info", Icon: Truck },
  Processing: { tone: "info", Icon: PackageCheck },
  Pending: { tone: "warning", Icon: Clock },
  Cancelled: { tone: "danger", Icon: XCircle },

  // Invoices
  Paid: { tone: "success", Icon: CheckCircle2 },
  Unpaid: { tone: "warning", Icon: Clock },
  Overdue: { tone: "danger", Icon: AlertCircle },

  // Enquiries
  New: { tone: "info", Icon: Info },
  "In Progress": { tone: "warning", Icon: Clock },
  Converted: { tone: "success", Icon: CheckCircle2 },
  Closed: { tone: "neutral", Icon: XCircle },

  // Customers / Stock
  Active: { tone: "success", Icon: CheckCircle2 },
  Inactive: { tone: "neutral", Icon: XCircle },
  "In Stock": { tone: "success", Icon: CheckCircle2 },
  "Low Stock": { tone: "warning", Icon: AlertCircle },
  "Out of Stock": { tone: "danger", Icon: XCircle },
};

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  info: "text-blue-700",
  neutral: "text-slate-600",
};

interface StatusIndicatorProps {
  status: string;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const entry = TONE_MAP[status] ?? { tone: "neutral" as StatusTone, Icon: Info };
  const { tone, Icon } = entry;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
