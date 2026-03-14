"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Loader2, CalendarIcon, Zap } from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"
import { getWeekStart, getWeekEnd, formatDateShort, getWeekRangeISO, formatDateISO } from "@/lib/date-week-utils"
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
  penaltyTotal: number
  presentDays: number
  regularSalaryTotal: number
  warningTotal: number
  weekEnd: string
  weekStart: string
  workingDays: number
}

export function WeeklySalaryScreen() {
  const { auth } = useAuth()
  const [selectedEmployee, setSelectedEmployee] = useState("")
  // Initialize with today's date to show current week
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [apiData, setApiData] = useState<ApiWeeklySalaryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // Calculate week from selected date
  const weekRange = useMemo(() => {
    return getWeekRangeISO(selectedDate)
  }, [selectedDate])

  const weekRangeDisplay = useMemo(() => {
    const start = getWeekStart(selectedDate)
    const end = getWeekEnd(selectedDate)
    return `${formatDateShort(start)} → ${formatDateShort(end)}`
  }, [selectedDate])

  // Fetch data from API
  useEffect(() => {
    const fetchWeeklySalary = async () => {
      if (!auth?.token) {
        setError("Authentication token not available")
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `http://3.109.152.136:8080/api/payrolls/getWeeklySalary?fromDate=${weekRange.start}&toDate=${weekRange.end}`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        )
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }
        const data = await response.json()
        setApiData(data)
      } catch (err) {
        console.error("[v0] Error fetching weekly salary:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklySalary()
  }, [weekRange, auth?.token])

  // Filter data based on selected employee
  const filteredData = apiData
    .filter((record) => (selectedEmployee ? record.employeeName === selectedEmployee : true))

  const employeeOptions = useMemo(() => {
    const uniqueEmployees = Array.from(new Set(apiData.map((r) => r.employeeName)))
    return [
      { value: "", label: "All Employees" },
      ...uniqueEmployees.map((emp) => ({ value: emp, label: emp }))
    ]
  }, [apiData])

  const handleGenerateSalary = () => {
    setShowGenerateDialog(true)
  }

  const handleConfirmGenerate = async () => {
    if (!auth?.token) {
      setError("Authentication token not available")
      setShowGenerateDialog(false)
      return
    }

    setLoading(true)
    try {
      // Format date for API (YYYY-MM-DD)
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      const response = await fetch(
        `http://3.109.152.136:8080/api/payrolls/GenerateWeeklySalary?anyDateInWeek=${dateString}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      // Refresh data after generating
      const data = await fetch(
        `http://3.109.152.136:8080/api/payrolls/getWeeklySalary?fromDate=${weekRange.start}&toDate=${weekRange.end}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      ).then(res => res.json())

      setApiData(data)
      setShowGenerateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate salary")
      console.error("Error generating weekly salary:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Employee Combo Box */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Employee</Label>
            <SearchableComboBox
              options={employeeOptions}
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              placeholder="Select employee..."
              searchPlaceholder="Search employees..."
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Select Date</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 py-1 justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 text-sm">
                  <CalendarIcon className="mr-1 h-3 w-3 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-900 font-medium text-sm">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setIsCalendarOpen(false)
                  }}
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Week Range Display */}
          <div className="space-y-1 flex-shrink-0">
            <Label htmlFor="week-range-display" className="text-slate-700 font-semibold text-sm">Week Range</Label>
            <input
              id="week-range-display"
              type="text"
              value={weekRangeDisplay}
              disabled
              className="h-9 rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-75 font-semibold text-slate-700"
            />
          </div>
          <div className="ml-auto">
            <Button 
              onClick={handleGenerateSalary}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="mr-2 h-4 w-4" />
              Generate Salary
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Weekly Salary Records</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading weekly salary data...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left font-semibold text-slate-900 border-r border-slate-200">Employee Name</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Week Start</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Week End</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Work Days</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Present</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Absent</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 border-r border-slate-200">Regular Salary</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 border-r border-slate-200">Overtime</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 border-r border-slate-200">Allowances</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 border-r border-slate-200">Penalty Mins</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 border-r border-slate-200">Penalty Amt</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Warnings</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900">Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <tr
                      key={record.employeeId}
                      className="border-b border-slate-200 hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 border-r border-slate-200">{record.employeeName}</td>
                      <td className="px-6 py-4 text-center text-slate-700 border-r border-slate-200">{record.weekStart}</td>
                      <td className="px-6 py-4 text-center text-slate-700 border-r border-slate-200">{record.weekEnd}</td>
                      <td className="px-6 py-4 text-center text-slate-700 border-r border-slate-200">{record.workingDays}</td>
                      <td className="px-6 py-4 text-center border-r border-slate-200">
                        <Badge className="bg-green-100 text-green-800 border-green-300">{record.presentDays}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center border-r border-slate-200">
                        <Badge className="bg-red-100 text-red-800 border-red-300">{record.absentDays}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 border-r border-slate-200">₹{record.regularSalaryTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-slate-700 border-r border-slate-200">₹{record.overtimeSalaryTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-slate-700 border-r border-slate-200">₹{record.allowanceTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right border-r border-slate-200">
                        {record.penaltyTotal > 0 ? (
                          <span className="text-red-600 font-medium">{record.penaltyTotal}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right border-r border-slate-200">
                        {record.penaltyAmount > 0 ? (
                          <span className="text-red-600 font-medium">₹{record.penaltyAmount.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-slate-200">
                        {record.warningTotal > 0 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">{record.warningTotal}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">₹{record.netPay.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-500">
                      No salary records found for the selected week and employee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Generate Salary Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Weekly Salary</DialogTitle>
            <DialogDescription>
              Weekly salary will be calculated for all employees for the week{' '}
              <span className="font-semibold text-slate-900">
                {weekRangeDisplay}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmGenerate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
