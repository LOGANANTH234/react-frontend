'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Users, Clock, Shield, FileText, BarChart3,
  AlertTriangle, PenLine, Lock, ChevronDown, ChevronUp,
  ArrowRight, CheckCircle2, Zap, Cpu, X, Phone, Mail,
  Building2, Send, Sparkles, TrendingUp, Info, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
//  Types & Data
// ─────────────────────────────────────────────────────────────

interface Module {
  id: string
  name: string
  description: string
  pricePerEmp: number      // per-employee monthly rate (0 if flatPrice is set)
  flatPrice?: number       // flat monthly fee regardless of employee count
  icon: React.ReactNode
  color: {
    bg: string; iconBg: string; iconText: string
    badge: string; badgeText: string; border: string; ring: string
  }
  mandatory: boolean
  dependsOn?: string[]
  popular?: boolean
}

const MODULES: Module[] = [
  // ── MANDATORY ──────────────────────────────────────────────
  {
    id: 'shift-mgmt', name: 'Shift Management',
    description: 'Create, edit & assign shifts with breaks, lunch windows and workday policies.',
    pricePerEmp: 25, icon: <Clock className="w-4 h-4" />, mandatory: true,
    color: { bg: 'bg-violet-50 dark:bg-violet-950/30', iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconText: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 dark:bg-violet-900/60', badgeText: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', ring: 'ring-violet-400' },
  },
  {
    id: 'emp-mgmt', name: 'Employee Management',
    description: 'Add, edit, activate/deactivate employees and sync biometric photos.',
    pricePerEmp: 25, icon: <Users className="w-4 h-4" />, mandatory: true,
    color: { bg: 'bg-blue-50 dark:bg-blue-950/30', iconBg: 'bg-blue-100 dark:bg-blue-900/50', iconText: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-900/60', badgeText: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', ring: 'ring-blue-400' },
  },
  {
    id: 'salary', name: 'Salary',
    description: 'Daily, weekly & monthly payroll with overtime, late-penalty engine and payslip PDF.',
    pricePerEmp: 25, icon: <FileText className="w-4 h-4" />, mandatory: true,
    color: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/60', badgeText: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-400' },
  },
  {
    id: 'view-edit-punches', name: 'View & Edit Punches',
    description: 'Review, add, edit and delete attendance punch records with a full audit trail.',
    pricePerEmp: 25, icon: <PenLine className="w-4 h-4" />, mandatory: true,
    color: { bg: 'bg-orange-50 dark:bg-orange-950/30', iconBg: 'bg-orange-100 dark:bg-orange-900/50', iconText: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-900/60', badgeText: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', ring: 'ring-orange-400' },
  },
  // ── OPTIONAL ───────────────────────────────────────────────
  {
    id: 'live-attendance', name: 'Live Attendance',
    description: 'Real-time dashboard with live punch status and Hikvision biometric sync.',
    pricePerEmp: 30, icon: <Zap className="w-4 h-4" />, mandatory: false, popular: true,
    color: { bg: 'bg-sky-50 dark:bg-sky-950/30', iconBg: 'bg-sky-100 dark:bg-sky-900/50', iconText: 'text-sky-600 dark:text-sky-400', badge: 'bg-sky-100 dark:bg-sky-900/60', badgeText: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', ring: 'ring-sky-400' },
    dependsOn: ['view-edit-punches'],
  },
  {
    id: 'emp-360', name: 'Employee 360°',
    description: 'Full profile — personal info, shift history, punch records and salary in one view.',
    pricePerEmp: 40, icon: <Users className="w-4 h-4" />, mandatory: false,
    color: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', iconBg: 'bg-indigo-100 dark:bg-indigo-900/50', iconText: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-900/60', badgeText: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', ring: 'ring-indigo-400' },
    dependsOn: ['emp-mgmt', 'salary'],
  },
  {
    id: 'payslip', name: 'Payslip',
    description: 'Employee-facing payslip viewer and downloader with PDF export.',
    pricePerEmp: 25, icon: <FileText className="w-4 h-4" />, mandatory: false,
    color: { bg: 'bg-teal-50 dark:bg-teal-950/30', iconBg: 'bg-teal-100 dark:bg-teal-900/50', iconText: 'text-teal-600 dark:text-teal-400', badge: 'bg-teal-100 dark:bg-teal-900/60', badgeText: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', ring: 'ring-teal-400' },
    dependsOn: ['salary'],
  },
  {
    id: 'role-mgmt', name: 'Role Management',
    description: 'Define roles with granular module and action permissions. Full RBAC control.',
    pricePerEmp: 0, flatPrice: 200, icon: <Shield className="w-4 h-4" />, mandatory: false,
    color: { bg: 'bg-rose-50 dark:bg-rose-950/30', iconBg: 'bg-rose-100 dark:bg-rose-900/50', iconText: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-900/60', badgeText: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', ring: 'ring-rose-400' },
  },
  {
    id: 'warning', name: 'Attendance Warnings',
    description: 'Auto-generate and review warnings based on configurable late arrival policies.',
    pricePerEmp: 5, icon: <AlertTriangle className="w-4 h-4" />, mandatory: false,
    color: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', iconBg: 'bg-yellow-100 dark:bg-yellow-900/50', iconText: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-900/60', badgeText: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800', ring: 'ring-yellow-400' },
    dependsOn: ['live-attendance'],
  },
]

// ── Preset bundles ─────────────────────────────────────────
interface Bundle {
  id: string
  name: string
  tagline: string
  modules: string[]   // optional module ids included
  badge?: string
  badgeColor?: string
}

const BUNDLES: Bundle[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Core operations, nothing extra',
    modules: [],
    badge: 'Most affordable',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Full visibility for growing teams',
    modules: ['live-attendance', 'payslip', 'warning'],
    badge: 'Most popular',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Complete suite with analytics & RBAC',
    modules: ['live-attendance', 'emp-360', 'payslip', 'role-mgmt', 'warning'],
    badge: 'Full featured',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
]

const MANDATORY_IDS = new Set(MODULES.filter(m => m.mandatory).map(m => m.id))
const SETUP_FEE = 50_000
const HARDWARE_FEE = 10_000
const ONE_TIME = SETUP_FEE + HARDWARE_FEE
const QUICK_COUNTS = [10, 25, 50, 100, 200, 500]

const FAQS = [
  { q: 'Is there a minimum number of employees?', a: 'No minimum — start with a single employee and scale up anytime. Pricing scales linearly.' },
  { q: 'Can I add or remove optional modules later?', a: 'Yes. Changes take effect on your next billing cycle with zero renegotiation.' },
  { q: 'Why are the 4 core modules mandatory?', a: 'Shift Management, Employee Management, Salary and View & Edit Punches form the operational backbone that every other module depends on.' },
  { q: 'Is there a contract or lock-in period?', a: 'Month-to-month by default. Annual plans get a flat 10% discount across the full subscription.' },
  { q: 'What does the hardware cost cover?', a: 'One Hikvision biometric terminal, pre-configured for your facility. Additional units available at ₹8,000 each.' },
  { q: 'Do prices include GST?', a: 'Prices shown are exclusive of GST (18%). A GST invoice is issued for every transaction — UPI, NEFT/RTGS, credit & debit cards accepted.' },
  { q: 'What kind of onboarding support is included?', a: 'Every plan includes on-site installation, data migration from your existing system, admin training session and 3 months of priority email support.' },
  { q: 'Can I get a custom quote for large teams?', a: 'Yes. For teams above 300 employees we offer volume pricing. Contact sales and we will prepare a personalised quote within 24 hours.' },
]

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

// ─────────────────────────────────────────────────────────────
//  useAnimatedNumber — smoothly counts up/down on value change
// ─────────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 350) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(target)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = display
    startTimeRef.current = null

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time
      const elapsed = time - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(startRef.current + (target - startRef.current) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return display
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.13em] uppercase text-muted-foreground mb-4">
      {children}
    </p>
  )
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-foreground text-background text-[11px] leading-relaxed px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  )
}

function ModuleCard({
  module, selected, onToggle, allSelected, disabledReason,
}: {
  module: Module; selected: boolean; onToggle: () => void; allSelected: Set<string>; disabledReason?: string
}) {
  const locked = module.mandatory
  const softDisabled = !!disabledReason && !locked
  const active = locked || (selected && !softDisabled)
  const dependencyNames = module.dependsOn
    ?.map(id => MODULES.find(m => m.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="relative">
      <button
        onClick={softDisabled || locked ? undefined : onToggle}
        disabled={locked}
        className={cn(
          'w-full text-left rounded-2xl border p-4 transition-all duration-200 relative group',
          softDisabled
            ? 'border-border bg-muted/40 opacity-50 cursor-not-allowed'
            : active
              ? cn(module.color.bg, module.color.border, 'ring-1', module.color.ring)
              : 'border-border bg-card',
          !locked && !active && !softDisabled && 'hover:border-muted-foreground/40 hover:shadow-sm',
          locked ? 'cursor-default' : softDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        {/* Popular badge */}
        {module.popular && !locked && !softDisabled && (
          <span className="absolute -top-2 left-4 bg-blue-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-white" /> Popular
          </span>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              active && !softDisabled ? cn(module.color.iconBg, module.color.iconText) : 'bg-muted text-muted-foreground'
            )}>
              {module.icon}
            </span>
            <span className="font-semibold text-sm text-foreground leading-tight">{module.name}</span>
          </div>
          <div className="shrink-0 mt-0.5">
            {locked ? (
              <span className={cn('flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full', module.color.badge, module.color.badgeText)}>
                <Lock className="w-2.5 h-2.5" /> Required
              </span>
            ) : softDisabled ? (
              <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                <Lock className="w-2.5 h-2.5" /> N/A
              </span>
            ) : (
              <span className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                selected ? cn(module.color.iconBg, module.color.border) : 'border-muted-foreground/30 bg-background'
              )}>
                {selected && <CheckCircle2 className={cn('w-3.5 h-3.5', module.color.iconText)} />}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed pl-9 mb-3">{module.description}</p>

        {/* Price + dependency hint */}
        <div className="flex items-center justify-between pl-9">
          <span className={cn('text-xs font-bold tabular-nums', active && !softDisabled ? module.color.iconText : 'text-muted-foreground')}>
            {module.flatPrice
              ? `₹${module.flatPrice}/mo flat`
              : `+₹${module.pricePerEmp}/emp/mo`}
          </span>
          {dependencyNames && !softDisabled && (
            <InfoTooltip text={`Works best with: ${dependencyNames}`} />
          )}
        </div>
      </button>

      {/* Admin-only banner — shown below card, not overlapping */}
      {softDisabled && disabledReason && (
        <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">{disabledReason}</p>
        </div>
      )}
    </div>
  )
}

function FaqItem({ item, open, onToggle }: { item: { q: string; a: string }; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left gap-4">
        <span className="text-sm font-medium text-foreground">{item.q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{item.a}</p>}
    </div>
  )
}

// ── Demo Modal ─────────────────────────────────────────────

function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', employees: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    if (!form.name || !form.email) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setSubmitted(true) }, 1200)
  }

  useEffect(() => {
    if (!open) { setTimeout(() => { setSubmitted(false); setForm({ name: '', company: '', phone: '', email: '', employees: '', message: '' }) }, 300) }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-foreground">Schedule a demo</p>
            <p className="text-xs text-muted-foreground mt-0.5">We'll reach out within 24 hours</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-foreground text-lg mb-2">Request received!</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Our team will contact you at <strong>{form.email}</strong> within 24 hours to schedule your demo.
            </p>
            <Button className="mt-6" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name', label: 'Full name *', placeholder: 'Arjun Sharma', icon: <Users className="w-4 h-4" /> },
                { key: 'company', label: 'Company', placeholder: 'PixxelPrint Ltd', icon: <Building2 className="w-4 h-4" /> },
              ].map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
                    <input
                      className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'email', label: 'Email address *', placeholder: 'arjun@company.com', icon: <Mail className="w-4 h-4" /> },
                { key: 'phone', label: 'Phone number', placeholder: '+91 98765 43210', icon: <Phone className="w-4 h-4" /> },
              ].map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
                    <input
                      className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Number of employees</label>
              <select
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                value={form.employees}
                onChange={e => setForm(f => ({ ...f, employees: e.target.value }))}
              >
                <option value="">Select range</option>
                {['1–10', '11–25', '26–50', '51–100', '101–200', '200+'].map(r => <option key={r} value={r}>{r} employees</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Message (optional)</label>
              <textarea
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                rows={3}
                placeholder="Tell us about your business or any specific requirements…"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
            </div>
            <Button
              className="w-full gap-2"
              onClick={handleSubmit}
              disabled={loading || !form.name || !form.email}
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> Sending…</span>
              ) : (
                <><Send className="w-4 h-4" /> Send demo request</>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              By submitting you agree to our Privacy Policy. No spam, ever.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export function PricingCalculator() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [empCount, setEmpCount] = useState(50)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  const [activeBundle, setActiveBundle] = useState<string | null>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [applicationType, setApplicationType] = useState<'all' | 'admin'>('all')
  const calcRef = useRef<HTMLDivElement>(null)

  // ── Sticky summary bar ───────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (calcRef.current) {
        const rect = calcRef.current.getBoundingClientRect()
        setShowStickyBar(rect.bottom < 0)
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // ── When admin-only selected, deselect role-mgmt ────────
  useEffect(() => {
    if (applicationType === 'admin') {
      setSelected(prev => {
        if (!prev.has('role-mgmt')) return prev
        const next = new Set(prev)
        next.delete('role-mgmt')
        return next
      })
    }
  }, [applicationType])

  // ── Toggle module ────────────────────────────────────────
  const toggleModule = useCallback((id: string) => {
    if (MANDATORY_IDS.has(id)) return
    if (id === 'role-mgmt' && applicationType === 'admin') return  // blocked for admin-only
    setActiveBundle(null)
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [applicationType])

  // ── Apply bundle preset ──────────────────────────────────
  const applyBundle = useCallback((bundle: Bundle) => {
    setActiveBundle(bundle.id)
    setSelected(new Set(bundle.modules))
  }, [])

  // ── Calculations ─────────────────────────────────────────
  const { totalPerEmp, flatMonthly, monthly, annual, firstYear, annualSavings, activeCount } = useMemo(() => {
    const activeIds = new Set([...MANDATORY_IDS, ...selected])
    const activeModules = MODULES.filter(m => activeIds.has(m.id))
    const perEmp = activeModules.filter(m => !m.flatPrice).reduce((s, m) => s + m.pricePerEmp, 0)
    const flat = activeModules.filter(m => m.flatPrice).reduce((s, m) => s + (m.flatPrice ?? 0), 0)
    const monthlyFull = perEmp * empCount + flat
    const discount = billing === 'annual' ? 0.9 : 1
    const monthly = Math.round(monthlyFull * discount)
    const annual = monthly * 12
    const annualSavings = billing === 'annual' ? Math.round(monthlyFull * 0.1 * 12) : 0
    return { totalPerEmp: perEmp, flatMonthly: flat, monthly, annual, firstYear: ONE_TIME + annual, annualSavings, activeCount: activeIds.size }
  }, [selected, empCount, billing])

  const animatedMonthly = useAnimatedNumber(monthly)
  const animatedAnnual = useAnimatedNumber(annual)
  const animatedFirstYear = useAnimatedNumber(firstYear)

  const mandatoryModules = MODULES.filter(m => m.mandatory)
  const optionalModules = MODULES.filter(m => !m.mandatory)
  const mandatoryTotal = mandatoryModules.reduce((s, m) => s + m.pricePerEmp, 0)
  // In admin mode, role-mgmt is not toggleable — exclude it from the "all selected" check
  const selectableOptionals = optionalModules.filter(m => !(m.id === 'role-mgmt' && applicationType === 'admin'))
  const allOptionalSelected = selectableOptionals.length > 0 && selectableOptionals.every(m => selected.has(m.id))

  // ROI estimates
  const hrHourlyCost = 300  // ₹/hr estimated HR labour rate
  const hoursPerEmpPerMonth = 1.5  // manual HR time per employee per month
  const manualCostPerMonth = Math.round(hrHourlyCost * hoursPerEmpPerMonth * empCount)
  const roiMonths = monthly > 0 ? Math.ceil(ONE_TIME / Math.max(manualCostPerMonth - monthly, 1)) : 0

  return (
    <>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* ── Sticky summary bar ───────────────────────────── */}
      <div className={cn(
        'fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-all duration-300',
        showStickyBar ? 'translate-y-0 shadow-md' : '-translate-y-full'
      )}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly</p>
              <p className="text-base font-bold tabular-nums">{inr(animatedMonthly)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">First-year total</p>
              <p className="text-base font-bold tabular-nums">{inr(animatedFirstYear)}</p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Employees</p>
              <p className="text-base font-bold tabular-nums">{empCount}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDemoOpen(true)}>Contact sales</Button>
            <Button size="sm" className="gap-1" onClick={() => setDemoOpen(true)}>Get quote <ArrowRight className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-background text-foreground">

        {/* ── Hero ─────────────────────────────────────── */}
        <div className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-4">Pricing</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
              Built for your team.<br className="hidden sm:block" /> Priced to fit.
            </h1>
            <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
              One setup fee. Per-employee subscription. Start with 4 core modules and
              add exactly what your business needs — nothing more.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              {[
                { label: `${MODULES.length} modules`, sub: 'to choose from' },
                { label: '4 required', sub: 'operational core' },
                { label: '₹0 hidden fees', sub: 'fully transparent' },
              ].map(s => (
                <div key={s.label} className="flex items-baseline gap-1.5 bg-card border border-border rounded-xl px-4 py-2.5">
                  <span className="font-bold text-sm text-foreground">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

          {/* ── One-time costs ────────────────────────── */}
          <section>
            <SectionLabel>One-time costs</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Onboarding & setup', value: inr(SETUP_FEE), sub: 'Installation, data migration & staff training' },
                { label: 'Hikvision biometric terminal', value: inr(HARDWARE_FEE), sub: 'Pre-configured hardware unit for your facility' },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                  <p className="text-base font-bold tabular-nums shrink-0">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Combined one-time cost: <span className="font-semibold text-foreground">{inr(ONE_TIME)}</span>
            </p>
          </section>

          {/* ── Calculator ────────────────────────────── */}
          <section ref={calcRef}>
            <SectionLabel>Cost calculator</SectionLabel>
            <div className="grid lg:grid-cols-3 gap-4">

              {/* Employee count + application type */}
              <div className="rounded-2xl border border-border bg-card px-5 py-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Team size</p>
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-4xl font-bold tabular-nums">{empCount}</span>
                  <span className="text-sm text-muted-foreground">employees</span>
                </div>
                <input type="range" min={1} max={500} step={1} value={empCount}
                  onChange={e => setEmpCount(Number(e.target.value))}
                  className="w-full accent-foreground mb-4"
                />
                <div className="grid grid-cols-3 gap-1.5 mb-5">
                  {QUICK_COUNTS.map(n => (
                    <button key={n} onClick={() => setEmpCount(n)}
                      className={cn(
                        'py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        empCount === n ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      )}
                    >{n}</button>
                  ))}
                </div>

                {/* Application needed dropdown */}
                <div className="border-t border-border pt-4">
                  <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block mb-2">
                    Application needed for
                  </label>
                  <div className="flex gap-2">
                    {([
                      { value: 'all', label: 'All Employees' },
                      { value: 'admin', label: 'Only Admin' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setApplicationType(opt.value)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all',
                          applicationType === opt.value
                            ? 'bg-foreground text-background border-foreground'
                            : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground bg-card'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {applicationType === 'admin' && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 leading-snug flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Role Management is not required for admin-only setup
                    </p>
                  )}
                </div>
              </div>

              {/* Billing + breakdown */}
              <div className="rounded-2xl border border-border bg-card px-5 py-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">Billing cycle</p>
                  <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                    {(['monthly', 'annual'] as const).map(c => (
                      <button key={c} onClick={() => setBilling(c)}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all',
                          billing === c ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {c} {c === 'annual' && billing !== 'annual' && <span className="text-emerald-500 font-bold ml-1">−10%</span>}
                      </button>
                    ))}
                  </div>
                  {billing === 'annual' && annualSavings > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-semibold">You save {inr(annualSavings)} per year</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">{activeCount} modules active</span>
                    <span className="text-sm font-bold tabular-nums">₹{totalPerEmp}/emp/mo{flatMonthly > 0 ? ` + ₹${flatMonthly} flat` : ''}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Monthly total</span>
                    <span className="text-sm font-bold tabular-nums">{inr(animatedMonthly)}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">Annual total</span>
                    <span className="text-sm font-bold tabular-nums">{inr(animatedAnnual)}</span>
                  </div>
                </div>
              </div>

              {/* First-year card */}
              <div className="rounded-2xl border border-border bg-card px-5 py-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">First-year total</p>
                  <p className="text-4xl font-bold tabular-nums mb-1 text-foreground">{inr(animatedFirstYear)}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {inr(ONE_TIME)} one-time + {inr(animatedAnnual)} annual
                  </p>
                </div>
                <Button variant="outline" onClick={() => setDemoOpen(true)}
                  className="mt-6 border-border text-foreground hover:bg-muted gap-2 w-full justify-center">
                  Get a quote <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* ── Bundle presets ────────────────────────── */}
          <section>
            <SectionLabel>Start with a bundle — or build your own below</SectionLabel>
            <div className="grid sm:grid-cols-3 gap-4">
              {BUNDLES.map(bundle => {
                const allIds = new Set([...MANDATORY_IDS, ...bundle.modules])
                const perEmp = MODULES.filter(m => allIds.has(m.id) && !m.flatPrice).reduce((s, m) => s + m.pricePerEmp, 0)
                const flat = MODULES.filter(m => allIds.has(m.id) && m.flatPrice).reduce((s, m) => s + (m.flatPrice ?? 0), 0)
                const isActive = activeBundle === bundle.id
                return (
                  <button
                    key={bundle.id}
                    onClick={() => applyBundle(bundle)}
                    className={cn(
                      'text-left rounded-2xl border p-5 transition-all duration-200',
                      isActive
                        ? 'border-foreground bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-background'
                        : 'border-border bg-card hover:border-foreground/40 hover:shadow-sm'
                    )}
                  >
                    {bundle.badge && (
                      <span className={cn('inline-block text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full mb-3', isActive ? 'bg-background/20 text-background' : bundle.badgeColor)}>
                        {bundle.badge}
                      </span>
                    )}
                    <p className={cn('font-bold text-lg mb-0.5', isActive ? 'text-background' : 'text-foreground')}>{bundle.name}</p>
                    <p className={cn('text-xs mb-4 leading-relaxed', isActive ? 'text-background/70' : 'text-muted-foreground')}>{bundle.tagline}</p>
                    <p className={cn('text-2xl font-bold tabular-nums mb-0.5', isActive ? 'text-background' : 'text-foreground')}>
                      ₹{perEmp}<span className={cn('text-sm font-normal ml-1', isActive ? 'text-background/60' : 'text-muted-foreground')}>/emp/mo</span>
                    </p>
                    {flat > 0 && (
                      <p className={cn('text-xs mb-2', isActive ? 'text-background/50' : 'text-muted-foreground')}>
                        + ₹{flat}/mo flat fees
                      </p>
                    )}
                    <p className={cn('text-xs', isActive ? 'text-background/50' : 'text-muted-foreground')}>
                      {MANDATORY_IDS.size + bundle.modules.length} modules included
                    </p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── Modules ───────────────────────────────── */}
          <section>
            {/* Mandatory */}
            <div className="mb-10">
              <SectionLabel>Mandatory modules — always included</SectionLabel>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {mandatoryModules.map(m => (
                  <ModuleCard key={m.id} module={m} selected={true} onToggle={() => {}} allSelected={selected} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Base rate: <span className="font-semibold text-foreground">₹{mandatoryTotal}/emp/mo</span> — included in every plan.
              </p>
            </div>

            {/* Optional */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>Optional add-ons — click to toggle</SectionLabel>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{selected.size}</span>/{optionalModules.length} added
                  </span>
                  {allOptionalSelected ? (
                    <button onClick={() => { setSelected(new Set()); setActiveBundle(null) }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                      Clear all
                    </button>
                  ) : (
                    <button onClick={() => { setSelected(new Set(selectableOptionals.map(m => m.id))); setActiveBundle(null) }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                      Select all
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-500"
                  style={{ width: `${(selected.size / optionalModules.length) * 100}%` }}
                />
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {optionalModules.map(m => (
                  <ModuleCard
                    key={m.id}
                    module={m}
                    selected={selected.has(m.id)}
                    onToggle={() => toggleModule(m.id)}
                    allSelected={selected}
                    disabledReason={m.id === 'role-mgmt' && applicationType === 'admin'
                      ? 'Not required for admin-only setup'
                      : undefined}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── ROI estimator ─────────────────────────── */}
          <section>
            <SectionLabel>ROI estimator</SectionLabel>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">How quickly does this pay for itself?</p>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {[
                  {
                    label: 'Manual HR cost / month',
                    value: inr(manualCostPerMonth),
                    sub: `${empCount} employees × ~1.5 hr HR time × ₹300/hr`,
                    color: 'text-rose-600',
                  },
                  {
                    label: 'System cost / month',
                    value: inr(monthly),
                    sub: `${activeCount} modules × ${empCount} employees`,
                    color: 'text-foreground',
                  },
                  {
                    label: 'Payback period',
                    value: manualCostPerMonth > monthly ? `~${roiMonths} months` : 'Immediate',
                    sub: manualCostPerMonth > monthly
                      ? `Save ${inr(manualCostPerMonth - monthly)}/mo from day one`
                      : 'System saves more than it costs',
                    color: 'text-emerald-600',
                  },
                ].map(item => (
                  <div key={item.label} className="px-6 py-5">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={cn('text-2xl font-bold tabular-nums mb-1', item.color)}>{item.value}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.sub}</p>
                  </div>
                ))}
              </div>
              <p className="px-6 py-3 text-[11px] text-muted-foreground bg-muted/30">
                Estimates based on ₹300/hr HR labour rate and ~1.5 hours of manual attendance/payroll work per employee per month. Adjust your employee count above to recalculate.
              </p>
            </div>
          </section>

          {/* ── Quick reference table ─────────────────── */}
          <section>
            <SectionLabel>Quick reference — monthly cost by team size</SectionLabel>
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Employees', 'Per employee', 'Monthly', 'Annual', 'First year'].map((h, i) => (
                      <th key={h} className={cn('py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider', i === 0 ? 'text-left' : 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[10, 25, 50, 100, 200].map((n, i) => {
                    const discount = billing === 'annual' ? 0.9 : 1
                    const m = Math.round((totalPerEmp * n + flatMonthly) * discount)
                    const a = m * 12
                    const fy = ONE_TIME + a
                    const isActive = n === empCount
                    return (
                      <tr key={n} onClick={() => setEmpCount(n)}
                        className={cn(
                          'border-b border-border last:border-0 cursor-pointer transition-colors',
                          isActive ? 'bg-muted/60' : i % 2 === 0 ? 'hover:bg-muted/30' : 'bg-muted/10 hover:bg-muted/30'
                        )}
                      >
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {n}
                          {isActive && <span className="ml-2 text-[10px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded">selected</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">₹{totalPerEmp}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{inr(m)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{inr(a)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold">{inr(fy)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click any row to update the calculator. Rates based on {activeCount} active modules at ₹{totalPerEmp}/emp/mo{flatMonthly > 0 ? ` + ₹${flatMonthly} flat/mo` : ''}.
              {billing === 'annual' && ' Annual discount applied.'}
            </p>
          </section>

          {/* ── Included in every plan ────────────────── */}
          <section>
            <SectionLabel>Included in every plan</SectionLabel>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: <Cpu className="w-4 h-4" />, text: 'Hikvision biometric integration' },
                { icon: <Zap className="w-4 h-4" />, text: 'Real-time attendance tracking' },
                { icon: <FileText className="w-4 h-4" />, text: 'Automated PDF payslip generation' },
                { icon: <Shield className="w-4 h-4" />, text: 'Role-based access control (RBAC)' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Overtime & late-penalty engine' },
                { icon: <CheckCircle2 className="w-4 h-4" />, text: 'Dedicated onboarding & support' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <span className="text-muted-foreground shrink-0">{f.icon}</span>
                  <span className="text-sm text-foreground">{f.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAQ ───────────────────────────────────── */}
          <section>
            <SectionLabel>Frequently asked</SectionLabel>
            <div className="rounded-2xl border border-border bg-card px-5">
              {FAQS.map((item, i) => (
                <FaqItem key={i} item={item} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Ready to see it in action?</h2>
              <p className="text-sm text-muted-foreground">Get a personalised demo for your team — no commitment required.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button variant="outline" onClick={() => setDemoOpen(true)}>Contact sales</Button>
              <Button className="gap-2" onClick={() => setDemoOpen(true)}>
                Schedule a demo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </section>

        </div>
      </div>

      {/* ── Mobile sticky CTA ─────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly total</p>
          <p className="text-base font-bold tabular-nums truncate">{inr(animatedMonthly)}</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setDemoOpen(true)}>
          Get quote <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  )
}