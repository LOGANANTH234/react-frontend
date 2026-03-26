"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { AlertCircle, CalendarIcon, Zap } from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"
import { getWeekStart, getWeekEnd, formatDateShort, getWeekRangeISO } from "@/lib/date-week-utils"
import { SearchableComboBox } from "./searchable-combo-box"
import { MultiViewCalendar } from "./multi-view-calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ApiWeeklySalaryRecord {
  absentDays: number
  allowanceTotal: number
  employeeId: string
  employeeName: string
  generatedAt: string | null
  netPay: number
  overtimeSalaryTotal: number
  penaltyAmount: number
  penaltyTotal: string
  presentDays: number
  regularSalaryTotal: number
  warningTotal: number
  weekEnd: string
  weekStart: string
  workingDays: number
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "₹0.00"
  return `₹${n.toFixed(2)}`
}

function attendancePct(present: number, working: number): string {
  if (!working) return "—"
  return `${Math.round((present / working) * 100)}%`
}

function attendanceColor(present: number, working: number): string {
  if (!working) return "text-gray-400"
  const pct = (present / working) * 100
  if (pct >= 90) return "text-green-600 font-semibold"
  if (pct >= 70) return "text-amber-600 font-semibold"
  return "text-red-500 font-semibold"
}

export function WeeklySalaryScreen() {
  const { auth } = useAuth()
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [apiData, setApiData] = useState<ApiWeeklySalaryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  const weekRange = useMemo(() => getWeekRangeISO(selectedDate), [selectedDate])

  const weekRangeDisplay = useMemo(() => {
    const s = getWeekStart(selectedDate)
    const e = getWeekEnd(selectedDate)
    return `${formatDateShort(s)} → ${formatDateShort(e)}`
  }, [selectedDate])

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchData = async (range: { start: string; end: string }) => {
    if (!auth?.token) { setError("Authentication token not available"); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(
        `http://localhost:8080/api/payrolls/getWeeklySalary?fromDate=${range.start}&toDate=${range.end}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )
      if (!res.ok) throw new Error(`API error: ${res.statusText}`)
      setApiData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally { setLoading(false) }
  }

  useEffect(() => { if (auth?.token) fetchData(weekRange) }, [weekRange, auth?.token])

  // ── generate ──────────────────────────────────────────────────────────────

  const handleConfirmGenerate = async () => {
    if (!auth?.token) { setShowGenerateDialog(false); return }
    setLoading(true)
    try {
      const d = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,"0")}-${String(selectedDate.getDate()).padStart(2,"0")}`
      const res = await fetch(
        `http://localhost:8080/api/payrolls/GenerateWeeklySalary?anyDateInWeek=${d}`,
        { method: "POST", headers: { Authorization: `Bearer ${auth.token}` } }
      )
      if (!res.ok) throw new Error(`API error: ${res.statusText}`)
      await fetchData(weekRange)
      setShowGenerateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate salary")
    } finally { setLoading(false) }
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const filteredData = apiData.filter(r =>
    selectedEmployee ? r.employeeName === selectedEmployee : true
  )

  const employeeOptions = useMemo(() => {
    const unique = Array.from(new Set(apiData.map(r => r.employeeName)))
    return [{ value: "", label: "All Employees" }, ...unique.map(e => ({ value: e, label: e }))]
  }, [apiData])

  const totals = useMemo(() => filteredData.reduce((acc, r) => ({
    regular:   acc.regular   + (r.regularSalaryTotal  || 0),
    ot:        acc.ot        + (r.overtimeSalaryTotal  || 0),
    allowance: acc.allowance + (r.allowanceTotal       || 0),
    penalty:   acc.penalty   + (r.penaltyAmount        || 0),
    net:       acc.net       + (r.netPay               || 0),
    present:   acc.present   + (r.presentDays          || 0),
    working:   acc.working   + (r.workingDays          || 0),
  }), { regular: 0, ot: 0, allowance: 0, penalty: 0, net: 0, present: 0, working: 0 }), [filteredData])

  return (
    <div className="w-full space-y-4 px-6 py-6">

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">

          <div className="space-y-1 flex-shrink-0">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Employee
            </Label>
            <SearchableComboBox
              options={employeeOptions}
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              placeholder="All Employees"
              searchPlaceholder="Search employees..."
            />
          </div>

          <div className="space-y-1 flex-shrink-0">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Select Date
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 gap-2 text-sm font-normal bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                  {selectedDate.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={selectedDate}
                  onSelect={d => { setSelectedDate(d); setIsCalendarOpen(false) }}
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Week range pill */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Week
            </Label>
            <div className="h-9 flex items-center px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 whitespace-nowrap">
              {weekRangeDisplay}
            </div>
          </div>

          <div className="ml-auto">
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              Generate Salary
            </Button>
          </div>

        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Weekly Salary Records</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              {filteredData.length} employee{filteredData.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-400">Loading weekly salary data…</div>
          ) : (
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-left   text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Employee</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Work Days</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Present</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Absent</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Att. %</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Regular</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Overtime</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Allowance</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Gross Pay</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Warnings</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Penalty Mins</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-300">Penalty (₹)</th>
                  <th className="px-5 py-3 text-right  text-xs font-semibold text-gray-500 whitespace-nowrap">Net Salary</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-14 text-center text-sm text-gray-400">
                      No salary records found for the selected week and employee.
                    </td>
                  </tr>
                ) : filteredData.map(r => {
                  const gross = (r.regularSalaryTotal || 0) + (r.overtimeSalaryTotal || 0) + (r.allowanceTotal || 0)
                  return (
                    <tr key={r.employeeId} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">

                      {/* Employee + week range */}
                      <td className="px-5 py-3.5 whitespace-nowrap border-r border-gray-300">
                        <div className="font-medium text-gray-800">{r.employeeName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{r.weekStart} – {r.weekEnd}</div>
                      </td>

                      {/* Attendance */}
                      <td className="px-5 py-3.5 text-center text-gray-700 whitespace-nowrap border-r border-gray-300">
                        {r.workingDays}
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-700 whitespace-nowrap border-r border-gray-300">
                        {r.presentDays}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap border-r border-gray-300">
                        {r.absentDays > 0
                          ? <span className="text-gray-700">{r.absentDays}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`px-5 py-3.5 text-center whitespace-nowrap border-r border-gray-300 ${attendanceColor(r.presentDays, r.workingDays)}`}>
                        {attendancePct(r.presentDays, r.workingDays)}
                      </td>

                      {/* Earnings */}
                      <td className="px-5 py-3.5 text-right font-mono text-gray-700 whitespace-nowrap border-r border-gray-300">
                        {fmt(r.regularSalaryTotal)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap border-r border-gray-300">
                        {(r.overtimeSalaryTotal || 0) > 0
                          ? <span className="text-gray-700">{fmt(r.overtimeSalaryTotal)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap border-r border-gray-300">
                        {(r.allowanceTotal || 0) > 0
                          ? <span className="text-gray-700">{fmt(r.allowanceTotal)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Gross */}
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-800 whitespace-nowrap border-r border-gray-300">
                        {fmt(gross)}
                      </td>

                      {/* Warnings */}
                      <td className="px-5 py-3.5 text-center border-r border-gray-300">
                        {r.warningTotal > 0
                          ? <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">{r.warningTotal}</Badge>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>

                      {/* Penalty mins */}
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap border-r border-gray-300">
                        {<span className="text-red-500 font-medium">{r.penaltyTotal}</span>}
                      </td>

                      {/* Penalty ₹ */}
                      <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap border-r border-gray-300">
                        {(r.penaltyAmount || 0) > 0
                          ? <span className="text-red-500 font-medium">{fmt(r.penaltyAmount)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Net salary */}
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-blue-600 whitespace-nowrap">
                        {fmt(r.netPay)}
                      </td>

                    </tr>
                  )
                })}
              </tbody>

              {/* Footer totals */}
              {filteredData.length > 1 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-sm">
                    <td className="px-5 py-3 text-gray-600" colSpan={2}>
                      Total <span className="font-normal text-gray-400 text-xs">({filteredData.length} employees)</span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-gray-700">{totals.present}</td>
                    <td className="px-5 py-3" />
                    <td className={`px-5 py-3 text-center ${attendanceColor(totals.present, totals.working)}`}>
                      {attendancePct(totals.present, totals.working)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(totals.regular)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(totals.ot)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(totals.allowance)}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-800 font-bold">
                      {fmt(totals.regular + totals.ot + totals.allowance)}
                    </td>
                    <td className="px-5 py-3" />
                    <td className="px-5 py-3" />
                    <td className="px-5 py-3 text-right font-mono text-gray-700">
                      {totals.penalty > 0 ? fmt(totals.penalty) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-blue-600">{fmt(totals.net)}</td>
                  </tr>
                </tfoot>
              )}

            </table>
          )}
        </div>
      </div>

      {/* ── Generate dialog ─────────────────────────────────────────────── */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Weekly Salary</DialogTitle>
            <DialogDescription>
              Salary will be calculated for all employees for the week{" "}
              <span className="font-semibold text-gray-900">{weekRangeDisplay}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmGenerate} className="bg-blue-600 hover:bg-blue-700 text-white">Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
