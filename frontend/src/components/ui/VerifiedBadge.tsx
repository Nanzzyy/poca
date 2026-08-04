import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <span title="Akun Terverifikasi" className={`inline-flex items-center ${className || ""}`}>
      <BadgeCheck className="fill-blue-500 text-white" strokeWidth={2.5} />
    </span>
  );
}