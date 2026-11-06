"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const child = children as ReactElement<{ id?: string }>;
  const isSingleControl =
    isValidElement(child) &&
    ["input", "select", "textarea"].includes(
      (child.type as string),
    );

  if (isSingleControl) {
    return (
      <div className="block text-[11px] font-medium text-on-surface-variant">
        <label className="mb-1 block" htmlFor={id}>{label}</label>
        {cloneElement(child, { id: child.props.id || id })}
      </div>
    );
  }

  return (
    <div className="block text-[11px] font-medium text-on-surface-variant">
      <div className="mb-1">{label}</div>
      {children}
    </div>
  );
}
