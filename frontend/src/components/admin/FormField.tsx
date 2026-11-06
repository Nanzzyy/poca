import { type ReactNode } from "react";

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[11px] font-medium text-on-surface-variant">
    <span className="block mb-1">{label}</span>{children}
  </label>;
}
