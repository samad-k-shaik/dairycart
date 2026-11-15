/**
 * RoleBadge: an account's role on the admin Users pages (#89; "Delivery boy" since #109).
 */
import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/types/auth"

const LOOK: Record<UserRole, { label: string; className: string }> = {
  ADMIN: { label: "Admin", className: "bg-primary-soft text-primary" },
  DELIVERY_BOY: { label: "Delivery boy", className: "bg-amber-50 text-amber-700" },
  USER: { label: "User", className: "bg-muted text-muted-foreground" },
}

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = LOOK[role]
  return <Badge className={`font-semibold ${className}`}>{label}</Badge>
}
