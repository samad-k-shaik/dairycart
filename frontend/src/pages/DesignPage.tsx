/**
 * DesignPage: a TEMPORARY "showroom" for the design review (M2-02, #21).
 *
 * It shows every design token (colours, typography, radius, shadow) and every
 * core shadcn component, so reviewers can approve the look before screens are built.
 * Remove it after the M2 design approval (M2-14).
 *
 * Everything here uses token classes (`bg-primary`, `text-muted-foreground`, ...),
 * never raw hex values. The hex values below are only labels for reviewers.
 */
import type { ReactNode } from "react"
import {
  CheckCircle2,
  LayoutDashboard,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---- Data shown on the page (plain arrays keep the JSX below short) ----

const colourTokens = [
  { name: "primary", hex: "#2563EB", className: "bg-primary" },
  { name: "primary-hover", hex: "#1D4ED8", className: "bg-primary-hover" },
  { name: "primary-soft", hex: "#EFF6FF", className: "bg-primary-soft" },
  { name: "background", hex: "#F8FAFC", className: "bg-background" },
  { name: "surface", hex: "#FFFFFF", className: "bg-surface" },
  { name: "border", hex: "#E2E8F0", className: "bg-border" },
  { name: "text (foreground)", hex: "#0F172A", className: "bg-foreground" },
  { name: "text-muted", hex: "#64748B", className: "bg-muted-foreground" },
  { name: "success", hex: "#16A34A", className: "bg-success" },
  { name: "warning", hex: "#D97706", className: "bg-warning" },
  { name: "danger", hex: "#DC2626", className: "bg-danger" },
]

// Status badge colours from the design system's "Status badge colours" table.
const statusBadges = [
  { status: "PLACED", className: "bg-primary-soft text-primary" },
  { status: "CONFIRMED", className: "bg-indigo-50 text-indigo-700" },
  { status: "OUT_FOR_DELIVERY", className: "bg-amber-50 text-amber-700" },
  { status: "DELIVERED", className: "bg-green-50 text-green-700" },
  { status: "CANCELLED", className: "bg-red-50 text-red-700" },
]

const typeScale = [
  { name: "Display", spec: "28 / 36 px · 800", className: "text-display font-extrabold" },
  { name: "H1", spec: "24 / 32 px · 700", className: "text-h1 font-bold" },
  { name: "H2", spec: "20 / 28 px · 700", className: "text-h2 font-bold" },
  { name: "H3", spec: "16 / 24 px · 600", className: "text-h3 font-semibold" },
  { name: "Body", spec: "14 / 22 px · 500", className: "text-body font-medium" },
  { name: "Small", spec: "12 / 16 px · 500", className: "text-small font-medium" },
  { name: "Price", spec: "18 / 24 px · 800", className: "text-price font-extrabold" },
]

const icons = [
  { name: "ShoppingCart", Icon: ShoppingCart },
  { name: "Plus", Icon: Plus },
  { name: "Minus", Icon: Minus },
  { name: "Package", Icon: Package },
  { name: "Truck", Icon: Truck },
  { name: "CheckCircle2", Icon: CheckCircle2 },
  { name: "LayoutDashboard", Icon: LayoutDashboard },
]

// ---- Page ----

function DesignPage() {
  return (
    // Page gutter: 16px mobile, 24px tablet, 32px desktop; max content width 1200px.
    <main className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 md:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-h1 font-bold">Design system</h1>
        <p className="text-muted-foreground">
          Temporary review page for M2-02. Values come from docs/06-ui-ux/design-system.md.
        </p>
      </header>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {colourTokens.map((token) => (
            <div key={token.name} className="rounded-2xl bg-surface p-3 shadow-card">
              <div className={`h-14 rounded-xl border ${token.className}`} />
              <p className="mt-2 font-semibold">{token.name}</p>
              <p className="text-small text-muted-foreground">{token.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography (Manrope)">
        <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-card">
          {typeScale.map((style) => (
            <div key={style.name} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="w-16 text-small text-muted-foreground">{style.name}</span>
              <span className={style.className}>
                {style.name === "Price" ? "₹60.00" : "Fresh milk, delivered daily"}
              </span>
              <span className="text-small text-muted-foreground">{style.spec}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius and shadow">
        <div className="flex flex-wrap gap-4">
          <Sample label="rounded-xl · 12px (buttons, inputs)" className="rounded-xl" />
          <Sample label="rounded-2xl · 16px (cards)" className="rounded-2xl shadow-card" />
          <Sample label="rounded-full (chips)" className="rounded-full" />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Secondary (outline)</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button>
            <ShoppingCart /> Add to cart
          </Button>
          <Button size="icon" className="rounded-full" aria-label="Add one">
            <Plus />
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          {statusBadges.map((badge) => (
            <Badge key={badge.status} className={badge.className}>
              {badge.status}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="design-name">Name</Label>
            <Input id="design-name" placeholder="e.g. Harish" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="design-phone">Phone (error state)</Label>
            <Input id="design-phone" defaultValue="12345" aria-invalid="true" />
            <p className="text-small text-danger">Enter a 10-digit phone number.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="design-disabled">Disabled</Label>
            <Input id="design-disabled" placeholder="Not editable" disabled />
          </div>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="text-h3">Cow Milk</CardTitle>
            <CardDescription>1 L · Fresh full-cream milk</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-price font-extrabold">₹60.00</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              <Plus /> Add
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Table">
        <div className="rounded-2xl bg-surface p-2 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>#1001</TableCell>
                <TableCell>Asha</TableCell>
                <TableCell>
                  <Badge className="bg-primary-soft text-primary">PLACED</Badge>
                </TableCell>
                <TableCell className="text-right">₹155.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>#1002</TableCell>
                <TableCell>Ravi</TableCell>
                <TableCell>
                  <Badge className="bg-green-50 text-green-700">DELIVERED</Badge>
                </TableCell>
                <TableCell className="text-right">₹60.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Sheet and toast">
        <div className="flex flex-wrap gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Order #1001</SheetTitle>
                <SheetDescription>
                  Sheets slide in from the side (used for admin order details).
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Button variant="outline" onClick={() => toast.success("Order placed")}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error("Something went wrong")}>
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Icons (Lucide React)">
        <div className="flex flex-wrap gap-4">
          {icons.map(({ name, Icon }) => (
            <div key={name} className="flex flex-col items-center gap-1 text-small">
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <span className="text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}

// ---- Small helpers used only on this page ----

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-h2 font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Sample({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`size-20 border bg-surface ${className}`} />
      <span className="text-small text-muted-foreground">{label}</span>
    </div>
  )
}

export default DesignPage
