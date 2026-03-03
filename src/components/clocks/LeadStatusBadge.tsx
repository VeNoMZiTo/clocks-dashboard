import React from "react";
import { getLeadStatusConfig, type LeadStatus } from "@/lib/lead-status";

export default function LeadStatusBadge({
  status,
  className = ""
}: {
  status: LeadStatus;
  className?: string;
}) {
  const config = getLeadStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium ${config.badgeClasses} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dotClasses}`} />
      {config.label}
    </span>
  );
}
