/**
 * DesignPage – route "/design" (#21). A TEMPORARY "living style guide".
 *
 * Shows every colour token, the typography scale and the core components in
 * one place, so reviewers can check the design system at a glance and take
 * screenshots for the design review (#33).
 *
 * FUTURE: remove this page (and its route) after the M2 design approval.
 */
import { Plus, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { QuantitySelector } from '@/components/common/QuantitySelector'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ORDER_STATUSES } from '@/lib/orderStatus'

const COLOR_TOKENS = [
  { name: 'primary', hex: '#2563EB', className: 'bg-primary' },
  { name: 'primary-hover', hex: '#1D4ED8', className: 'bg-primary-hover' },
  { name: 'primary-soft', hex: '#EFF6FF', className: 'bg-primary-soft' },
  { name: 'background', hex: '#F8FAFC', className: 'bg-background' },
  { name: 'surface', hex: '#FFFFFF', className: 'bg-surface' },
  { name: 'border', hex: '#E2E8F0', className: 'bg-border' },
  { name: 'text', hex: '#0F172A', className: 'bg-foreground' },
  { name: 'text-muted', hex: '#64748B', className: 'bg-muted-foreground' },
  { name: 'success', hex: '#16A34A', className: 'bg-success' },
  { name: 'warning', hex: '#D97706', className: 'bg-warning' },
  { name: 'danger', hex: '#DC2626', className: 'bg-danger' },
]

const TYPE_SCALE = [
  { name: 'Display · 28/36 · 800', className: 'text-[28px]/9 font-extrabold' },
  { name: 'H1 · 24/32 · 700', className: 'text-2xl/8 font-bold' },
  { name: 'H2 · 20/28 · 700', className: 'text-xl/7 font-bold' },
  { name: 'H3 · 16/24 · 600', className: 'text-base/6 font-semibold' },
  { name: 'Body · 14/22 · 500', className: 'text-sm/[22px] font-medium' },
  { name: 'Small · 12/16 · 500', className: 'text-xs/4 font-medium' },
  { name: 'Price · 18/24 · 800', className: 'text-lg/6 font-extrabold' },
]

export function DesignPage() {
  const [quantity, setQuantity] = useState(2)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Design system" description="Temporary page for the M2 design review (#21). Tokens from docs/06-ui-ux/design-system.md." />

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Colour tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} className="flex items-center gap-3">
              <span className={`size-10 shrink-0 rounded-xl ring-1 ring-border ${token.className}`} />
              <span>
                <span className="block font-semibold">{token.name}</span>
                <span className="text-xs text-muted-foreground">{token.hex}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="gap-3 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Typography · Manrope</h2>
        {TYPE_SCALE.map((style) => (
          <p key={style.name} className={style.className}>
            {style.name}
          </p>
        ))}
      </Card>

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="lg">
            <ShoppingCart /> Large
          </Button>
          <Button size="icon" className="rounded-full" aria-label="Add">
            <Plus className="size-5" />
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" onClick={() => toast.success('This is a success toast')}>
            Show toast
          </Button>
        </div>
      </Card>

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Status badges</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Card>

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Form controls</h2>
        <div className="grid gap-4 sm:max-w-md">
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-name">Label</Label>
            <Input id="demo-name" placeholder="Placeholder text" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-error">Invalid input</Label>
            <Input id="demo-error" aria-invalid defaultValue="12345" />
            <p className="text-xs font-semibold text-danger">Inline error text uses the danger colour.</p>
          </div>
          <QuantitySelector value={quantity} onChange={setQuantity} label="demo" />
        </div>
      </Card>

      <Card className="gap-4 px-5 py-5">
        <h2 className="text-xl/7 font-bold">Skeleton</h2>
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </Card>
    </div>
  )
}
