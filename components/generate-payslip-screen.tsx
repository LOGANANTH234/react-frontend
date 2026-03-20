"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Search, Filter, AlertCircle, CalendarIcon, Eye, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MONTHS } from "@/lib/payslip-data"
import { PayslipStatusBadge } from "./payslip-status-badge"
import { MultiViewCalendar } from "./multi-view-calendar"
import { MonthYearCalendar } from "./month-year-calendar"
import { formatDateShort, getWeekStart, getWeekEnd } from "@/lib/date-week-utils"

// ── Java boolean "isPaySlipGenerated" → Jackson serialises as "paySlipGenerated" ──
interface ApiEmployee {
  employeeName: string
  employeeId: string
  imageUrl: string | null
  role: string | null
  gender: string | null
  salaryFrequency: string | null
  paySlipGenerated: boolean
  totalAmount: string
}

const BASE = "http://3.109.152.136:3000/api/pdf"

export function GeneratePayslipScreen() {
  const [selectedEmployee, setSelectedEmployee]   = useState<string>("")
  const [selectedType, setSelectedType]           = useState<string>("monthly")
  const [selectedDate, setSelectedDate]           = useState<Date>(new Date())
  const [selectedStatus, setSelectedStatus]       = useState<string>("")
  const [searchQuery, setSearchQuery]             = useState<string>("")
  const [showPendingModal, setShowPendingModal]   = useState<boolean>(false)
  const [isDailyCalendarOpen, setIsDailyCalendarOpen]     = useState(false)
  const [isWeeklyCalendarOpen, setIsWeeklyCalendarOpen]   = useState(false)
  const [isMonthlyCalendarOpen, setIsMonthlyCalendarOpen] = useState(false)
  const [generatingEmployees, setGeneratingEmployees] = useState<Set<string>>(new Set())
  const [generatedEmployees, setGeneratedEmployees]   = useState<Set<string>>(new Set())
  const [failedEmployees, setFailedEmployees]         = useState<Set<string>>(new Set())
  const [apiEmployees, setApiEmployees]           = useState<ApiEmployee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen]             = useState(false)
  const [previewName, setPreviewName]             = useState<string>("")
  const [isLoadingPreview, setIsLoadingPreview]   = useState(false)
  const [previewError, setPreviewError]           = useState(false)
  // Each page rendered to a data-URL string via PDF.js
  const [pdfPages, setPdfPages]                   = useState<string[]>([])
  const [currentPage, setCurrentPage]             = useState(1)

  // ── Auth header ────────────────────────────────────────────────────────────
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("auth")
      ? JSON.parse(localStorage.getItem("auth")!).token
      : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ── Date params ────────────────────────────────────────────────────────────
  const pad = (n: number) => String(n).padStart(2, "0")

  const getDateParam = () => {
    const y = selectedDate.getFullYear()
    const m = pad(selectedDate.getMonth() + 1)
    const d = pad(selectedDate.getDate())
    return selectedType === "monthly" ? `${y}-${m}` : `${y}-${m}-${d}`
  }

  // ── Build URLs ─────────────────────────────────────────────────────────────
  // Generate = marks isPaySlipGenerated=true + downloads
  const buildGenerateUrl = (employeeName: string) => {
    const n = encodeURIComponent(employeeName)
    const d = getDateParam()
    if (selectedType === "monthly") return `${BASE}/payslip/generate/monthly/${n}?month=${d}`
    if (selectedType === "daily")   return `${BASE}/payslip/generate/daily/${n}?date=${d}`
    return `${BASE}/payslip/generate/weekly/${n}?date=${d}`
  }

  // Preview = read-only, never marks isPaySlipGenerated=true
  const buildPreviewUrl = (employeeName: string) => {
    const n = encodeURIComponent(employeeName)
    const d = getDateParam()
    if (selectedType === "monthly") return `${BASE}/payslip/preview/monthly/${n}?month=${d}`
    if (selectedType === "daily")   return `${BASE}/payslip/preview/daily/${n}?date=${d}`
    return `${BASE}/payslip/preview/weekly/${n}?date=${d}`
  }

  // ── Fetch employees ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedType) { setApiEmployees([]); return }
      setIsLoadingEmployees(true)
      try {
        const url = `${BASE}/getEmployeesForPayslip?type=${selectedType.toUpperCase()}&date=${getDateParam()}`
        const res = await fetch(url, { headers: getAuthHeaders() })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        setApiEmployees(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("[payslip] fetch error:", err)
        setApiEmployees([])
      } finally {
        setIsLoadingEmployees(false)
      }
    }
    fetchEmployees()
  }, [selectedType, selectedDate])

  // ── Week label ─────────────────────────────────────────────────────────────
  const weekRangeDisplay = useMemo(() =>
    `${formatDateShort(getWeekStart(selectedDate))} → ${formatDateShort(getWeekEnd(selectedDate))}`,
    [selectedDate])

  const dateBtnLabel = useMemo(() => {
    if (selectedType === "daily")   return formatDateShort(selectedDate)
    if (selectedType === "weekly")  return weekRangeDisplay
    return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }, [selectedType, selectedDate, weekRangeDisplay])

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredPayslips = useMemo(() => {
    let r = apiEmployees
    if (selectedEmployee) r = r.filter(p => p.employeeId === selectedEmployee)
    if (selectedStatus === "generated") r = r.filter(p => p.paySlipGenerated === true)
    if (selectedStatus === "pending")   r = r.filter(p => p.paySlipGenerated === false)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      r = r.filter(p =>
        p.employeeName?.toLowerCase().includes(q) ||
        p.employeeId?.toLowerCase().includes(q))
    }
    return r
  }, [apiEmployees, selectedEmployee, selectedStatus, searchQuery])

  const pendingEmployeeNames = useMemo(() =>
    Array.from(new Set(filteredPayslips
      .filter(p => p.paySlipGenerated === false)
      .map(p => p.employeeName))),
    [filteredPayslips])

  // ── PREVIEW (PDF.js canvas renderer — no browser toolbar, no download) ────
  const handlePreview = async (employeeName: string) => {
    setPreviewName(employeeName)
    setPreviewOpen(true)
    setIsLoadingPreview(true)
    setPreviewError(false)
    setPdfPages([])
    setCurrentPage(1)

    try {
      const res = await fetch(buildPreviewUrl(employeeName), {
        method: "GET",
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`Preview failed (${res.status})`)

      const arrayBuffer = await res.arrayBuffer()

      // Load PDF.js via script tag — works reliably in Next.js without installing a package
      const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
      const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = PDFJS_CDN
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load PDF.js"))
          document.head.appendChild(script)
        })
      }

      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const pages: string[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        // Scale to ~1.5× for crisp display
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement("canvas")
        canvas.width  = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext("2d")!
        await page.render({ canvasContext: ctx, viewport }).promise
        pages.push(canvas.toDataURL("image/png"))
      }

      setPdfPages(pages)
    } catch (err) {
      console.error("[payslip] preview error:", err)
      setPreviewError(true)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // ── GENERATE + DOWNLOAD ────────────────────────────────────────────────────
  const handleGenerateForEmployee = async (employeeName: string) => {
    setGeneratingEmployees(prev => new Set(prev).add(employeeName))
    setFailedEmployees(prev => { const n = new Set(prev); n.delete(employeeName); return n })

    try {
      const res = await fetch(buildGenerateUrl(employeeName), {
        method: "GET",
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`Generate failed (${res.status})`)

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = `${employeeName}_${selectedType}_${getDateParam()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

      setGeneratedEmployees(prev => new Set(prev).add(employeeName))
      setApiEmployees(prev =>
        prev.map(e => e.employeeName === employeeName ? { ...e, paySlipGenerated: true } : e))
    } catch (err) {
      console.error("[payslip] generate error:", err)
      setFailedEmployees(prev => new Set(prev).add(employeeName))
    } finally {
      setGeneratingEmployees(prev => {
        const n = new Set(prev); n.delete(employeeName); return n
      })
    }
  }

  const handleClearFilters = () => {
    setSelectedEmployee(""); setSelectedType("monthly")
    setSelectedStatus(""); setSearchQuery(""); setSelectedDate(new Date())
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      <div>
        <h1 className="text-3xl font-bold text-foreground">Generate Payslips</h1>
        <p className="text-muted-foreground mt-2">Filter and generate payslips for your employees</p>
      </div>

      {/* ── FILTER CARD ──────────────────────────────────────────────────── */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">

            {/* ① Employee */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium text-foreground">Employee</label>
              <Select value={selectedEmployee || "all"}
                onValueChange={v => setSelectedEmployee(v === "all" ? "" : v)}
                disabled={isLoadingEmployees}>
                <SelectTrigger className="h-10 w-full rounded-lg text-sm">
                  <SelectValue placeholder={isLoadingEmployees ? "Loading…" : "All Employees"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees ({apiEmployees.length})</SelectItem>
                  {apiEmployees.map(emp => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ② Type */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-10 w-full rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ③ Date / Week / Month */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium text-foreground">
                {selectedType === "daily" ? "Date" : selectedType === "weekly" ? "Week" : "Month"}
              </label>
              {selectedType === "daily" && (
                <Popover open={isDailyCalendarOpen} onOpenChange={setIsDailyCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full rounded-lg text-sm justify-start font-normal overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{dateBtnLabel}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <MultiViewCalendar selected={selectedDate}
                      onSelect={(d: Date) => { setSelectedDate(d); setIsDailyCalendarOpen(false) }} />
                  </PopoverContent>
                </Popover>
              )}
              {selectedType === "weekly" && (
                <Popover open={isWeeklyCalendarOpen} onOpenChange={setIsWeeklyCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full rounded-lg text-sm justify-start font-normal overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{dateBtnLabel}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <MultiViewCalendar selected={selectedDate}
                      onSelect={(d: Date) => { setSelectedDate(d); setIsWeeklyCalendarOpen(false) }} />
                  </PopoverContent>
                </Popover>
              )}
              {selectedType === "monthly" && (
                <Popover open={isMonthlyCalendarOpen} onOpenChange={setIsMonthlyCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full rounded-lg text-sm justify-start font-normal overflow-hidden">
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{dateBtnLabel}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <MonthYearCalendar selected={selectedDate}
                      onSelect={(d: Date) => { setSelectedDate(d); setIsMonthlyCalendarOpen(false) }} />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* ④ Status */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={selectedStatus || "all"}
                onValueChange={v => setSelectedStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="h-10 w-full rounded-lg text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ⑤ Search */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium text-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employee…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg pl-9 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={handleClearFilters} className="rounded-lg h-10 text-sm">
              Clear Filters
            </Button>
            <Button onClick={() => { setGeneratedEmployees(new Set()); setFailedEmployees(new Set()); setShowPendingModal(true) }}
              className="rounded-lg h-10 text-sm bg-blue-600 hover:bg-blue-700">
              Generate Payslips
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── RESULTS ────────────────────────────────────────────────────────── */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Payslip Results ({filteredPayslips.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">

          {/* ── LOADING / EMPTY ── */}
          {isLoadingEmployees ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Loading employees…</div>
          ) : filteredPayslips.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No payslips found for the selected date and type
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE (hidden on mobile) ── */}
              <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground h-10">Employee</TableHead>
                      <TableHead className="font-semibold text-foreground h-10">Role</TableHead>
                      <TableHead className="font-semibold text-foreground h-10">Type</TableHead>
                      <TableHead className="font-semibold text-foreground h-10 text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-foreground h-10">Status</TableHead>
                      <TableHead className="font-semibold text-foreground h-10 text-center w-16">Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayslips.map((p, i) => (
                      <TableRow key={p.employeeId ?? i} className="border-b border-border hover:bg-muted/50">
                        <TableCell className="py-3">
                          <div className="font-medium text-foreground">{p.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{p.employeeId}</div>
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground text-sm">{p.role ?? "—"}</TableCell>
                        <TableCell className="py-3 text-sm">
                          <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
                            {p.salaryFrequency ?? selectedType.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-foreground font-semibold text-right">
                          ₹{Number(p.totalAmount ?? 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="py-3">
                          <PayslipStatusBadge status={p.paySlipGenerated ? "generated" : "pending"} />
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Button variant="ghost" size="sm"
                            onClick={() => handlePreview(p.employeeName)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                            title="Preview payslip">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── MOBILE CARDS (visible only on mobile) ── */}
              <div className="sm:hidden divide-y divide-border">
                {filteredPayslips.map((p, i) => (
                  <div key={p.employeeId ?? i} className="px-4 py-3 flex items-center gap-3">
                    {/* Left: name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{p.employeeName}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{p.role ?? "—"}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                          {p.salaryFrequency ?? selectedType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {/* Right: amount + status + preview */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-bold text-foreground">
                        ₹{Number(p.totalAmount ?? 0).toLocaleString("en-IN")}
                      </span>
                      <PayslipStatusBadge status={p.paySlipGenerated ? "generated" : "pending"} />
                    </div>
                    <Button variant="ghost" size="sm"
                      onClick={() => handlePreview(p.employeeName)}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 shrink-0"
                      title="Preview payslip">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SUMMARY ── */}
          {filteredPayslips.length > 0 && (
            <div className="mt-4 pt-4 mx-4 sm:mx-0 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex sm:flex-col items-center sm:justify-center justify-between px-1">
                <p className="text-xs text-muted-foreground sm:mb-1 sm:text-center">Total Employees</p>
                <p className="text-base sm:text-2xl font-bold text-foreground sm:text-center">{filteredPayslips.length}</p>
              </div>
              <div className="flex sm:flex-col items-center sm:justify-center justify-between px-1">
                <p className="text-xs text-muted-foreground sm:mb-1 sm:text-center">Total Amount</p>
                <p className="text-base sm:text-2xl font-bold text-foreground sm:text-center truncate">
                  ₹{filteredPayslips.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:justify-center justify-between px-1">
                <p className="text-xs text-muted-foreground sm:mb-1 sm:text-center">Average</p>
                <p className="text-base sm:text-2xl font-bold text-foreground sm:text-center truncate">
                  ₹{Math.round(filteredPayslips.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0) / filteredPayslips.length).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PDF PREVIEW MODAL (PDF.js canvas — no browser toolbar, no download) ── */}
      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPdfPages([]) }}>
        <DialogContent className="max-w-2xl w-full h-[92vh] flex flex-col p-0 gap-0 overflow-hidden [&>button:last-child]:hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 bg-white">
            <div>
              <DialogTitle className="text-base font-semibold leading-tight">
                Payslip Preview — {previewName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} · {dateBtnLabel}
              </p>
            </div>
            {/* Page navigation (only when loaded) */}
            {pdfPages.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30"
                >‹</button>
                <span className="tabular-nums">{currentPage} / {pdfPages.length}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pdfPages.length, p + 1))}
                  disabled={currentPage === pdfPages.length}
                  className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30"
                >›</button>
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg ml-2"
              onClick={() => { setPreviewOpen(false); setPdfPages([]) }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Canvas viewer ── */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#525659] flex flex-col items-center py-4">

            {/* Loading */}
            {isLoadingPreview && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white">
                <div className="h-9 w-9 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <p className="text-sm opacity-80">Rendering payslip…</p>
              </div>
            )}

            {/* Error */}
            {!isLoadingPreview && previewError && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-white font-medium">Failed to load preview</p>
                <p className="text-white/60 text-sm text-center max-w-xs">
                  No salary data found for this employee and period
                </p>
                <Button variant="outline" size="sm" className="mt-1 rounded-lg bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={() => handlePreview(previewName)}>
                  Retry
                </Button>
              </div>
            )}

            {/* Pages rendered as images — onContextMenu disabled to block right-click save */}
            {!isLoadingPreview && pdfPages.length > 0 && pdfPages.map((src, idx) => (
              <div key={idx}
                className={`w-full px-4 transition-opacity duration-200 ${idx + 1 === currentPage ? "opacity-100" : "hidden"}`}
              >
                <img
                  src={src}
                  alt={`Page ${idx + 1}`}
                  draggable={false}
                  onContextMenu={e => e.preventDefault()}
                  className="w-full block select-none rounded shadow-xl"
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                />
              </div>
            ))}
          </div>

          {/* ── Footer: page dots for multi-page ── */}
          {pdfPages.length > 1 && (
            <div className="shrink-0 flex items-center justify-center gap-2 py-3 border-t border-border bg-white">
              {pdfPages.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentPage(idx + 1)}
                  className={`h-2 rounded-full transition-all ${ idx + 1 === currentPage ? "w-6 bg-blue-600" : "w-2 bg-gray-300 hover:bg-gray-400" }`}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── GENERATE PENDING MODAL ───────────────────────────────────────── */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Payslips to Generate
            </DialogTitle>
            <DialogDescription>
              {pendingEmployeeNames.length > 0
                ? `${pendingEmployeeNames.length} employee(s) have pending ${selectedType} payslips`
                : "No pending payslips found in the current view"}
            </DialogDescription>
          </DialogHeader>

          {pendingEmployeeNames.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto py-4">
              {pendingEmployeeNames.map((name, idx) => {
                const isGenerating = generatingEmployees.has(name)
                const isGenerated  = generatedEmployees.has(name)
                const isFailed     = failedEmployees.has(name)
                return (
                  <div key={`${name}-${idx}`}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isGenerated ? "border-green-600/30 bg-green-50 dark:bg-green-950/30"
                      : isFailed  ? "border-red-400/30 bg-red-50 dark:bg-red-950/30"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${
                        isGenerated ? "bg-green-600" : isFailed ? "bg-red-500" : "bg-amber-600"
                      }`} />
                      <span className={`text-sm font-medium truncate ${
                        isGenerated ? "text-green-700 dark:text-green-400"
                        : isFailed  ? "text-red-600 dark:text-red-400"
                        : "text-foreground"
                      }`}>{name}</span>
                      {isGenerated && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800">PDF Downloaded</span>
                      )}
                      {isFailed && (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-800">Failed</span>
                      )}
                    </div>
                    <Button size="sm"
                      onClick={() => handleGenerateForEmployee(name)}
                      disabled={isGenerated || isGenerating}
                      className={`ml-3 shrink-0 rounded-lg h-8 text-xs ${
                        isGenerated ? "bg-green-600 hover:bg-green-700"
                        : isFailed  ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isGenerating ? "Generating…" : isGenerated ? "Done" : isFailed ? "Retry" : "Generate"}
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No pending payslips to generate</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline"
              onClick={() => { setShowPendingModal(false); setGeneratingEmployees(new Set()); setGeneratedEmployees(new Set()); setFailedEmployees(new Set()) }}
              className="rounded-lg h-10">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
