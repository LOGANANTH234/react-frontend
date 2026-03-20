"use client"

import { useState, useEffect, useMemo } from "react"
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
import { AlertCircle, CalendarIcon, Zap } from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"
import { SearchableComboBox } from "./searchable-combo-box"
import { MonthYearCalendar } from "./month-year-calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface MonthlyPayrollRecord {
  id?: string
  employeeId: string
  employeeName: string
  payrollMonth: string
  workingDays: number
  presentDays: number
  absentDays: number
  regularSalaryTotal: number
  overtimeSalaryTotal: number
  allowanceTotal: number
  PenaltyMins: string
  penaltyAmount: number
  warningTotal: number
  netPay: number
}

interface ApiResponse {
  employeeId: string
  employeeName: string
  payrollMonth: string
  workingDays: number
  presentDays: number
  absentDays: number
  regularSalaryTotal: number
  overtimeSalaryTotal: number
  allowanceTotal: number
  PenaltyMins: string
  penaltyAmount: number
  warningTotal: number
  netPay: number
  generatedAt: string | null
}

export function MonthlyPayrollScreen() {
  const { auth } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [data, setData] = useState<MonthlyPayrollRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // Fetch data from API
  useEffect(() => {
    const fetchMonthlyPayrollData = async () => {
      if (!auth?.token) {
        setError("Authentication token not available")
        return
      }

      setLoading(true)
      setError(null)
      try {
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const selectedMonth = `${year}-${month}`
        const response = await fetch(
          `http://3.109.152.136/api/payrolls/getMonthlySalary?month=${selectedMonth}`,
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const apiData: ApiResponse[] = await response.json()

        const dataWithId: MonthlyPayrollRecord[] = apiData.map((item, index) => ({
          id: index.toString(),
          ...item,
        }))

        setData(dataWithId)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
        console.error("Error fetching monthly payroll data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchMonthlyPayrollData()
  }, [selectedDate, auth?.token])

  const filteredData = data.filter((record) =>
    selectedEmployee ? record.employeeName === selectedEmployee : true
  )

  const employeeOptions = useMemo(() => {
    const uniqueEmployees = Array.from(new Set(data.map((r) => r.employeeName)))
    return [
      { value: "", label: "All Employees" },
      ...uniqueEmployees.map((emp) => ({ value: emp, label: emp }))
    ]
  }, [data])

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
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const selectedMonth = `${year}-${month}`

      const response = await fetch(
        `http://3.109.152.136/api/payrolls/generateMonthlyPayroll?month=${selectedMonth}`,
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
      const apiData: ApiResponse[] = await fetch(
        `http://3.109.152.136/api/payrolls/getMonthlySalary?month=${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      ).then(res => res.json())

      const dataWithId: MonthlyPayrollRecord[] = apiData.map((item, index) => ({
        id: index.toString(),
        ...item,
      }))

      setData(dataWithId)
      setShowGenerateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate salary")
      console.error("Error generating monthly salary:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6 px-6 py-8">

      {/* Filters Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
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
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Select Month</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 py-1 justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 text-sm">
                  <CalendarIcon className="mr-1 h-3 w-3 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-900 font-medium text-sm">
                    {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MonthYearCalendar
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Monthly Payroll Records</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading payroll data...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left font-semibold text-slate-900 border-r border-slate-200">Employee Name</th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">Month</th>
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
                      key={record.id}
                      className="border-b border-slate-200 hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 border-r border-slate-200">{record.employeeName}</td>
                      <td className="px-6 py-4 text-center text-slate-700 border-r border-slate-200">{record.payrollMonth}</td>
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
                        {record.PenaltyMins !== "0h:0m" ? (
                          <span className="text-red-600 font-medium">{record.PenaltyMins}</span>
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
                    <td colSpan={12} className="text-center py-12 text-slate-500">
                      No payroll records found for the selected month and employee.
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
            <DialogTitle>Generate Monthly Salary</DialogTitle>
            <DialogDescription>
              Monthly salary will be calculated for all employees for{' '}
              <span className="font-semibold text-slate-900">
                {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
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
