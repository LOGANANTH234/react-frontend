'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CalendarIcon, Search } from 'lucide-react'
import { useAuth } from '@/lib/contexts/auth-context'
import { SearchableComboBox } from './searchable-combo-box'
import { MultiViewCalendar } from './multi-view-calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface WarningRecord {
  id: number
  employeeName: string
  warningDate: string
  lateMinutes: number
  penaltyApplied: number
  warningType: string
  expectedTime: string
  actualTime: string
}

interface ApiResponse {
  id: number
  employeeId: string
  employeeName: string
  warningDate: string
  lateMinutes: number
  penaltyApplied: number
  warningType: string
  expectedTime: string
  actualTime: string
}

const WARNING_TYPE_BADGES: Record<string, { bg: string; text: string }> = {
  SHIFT_START: { bg: 'bg-red-100', text: 'text-red-800' },
  SHIFT_END: { bg: 'bg-orange-100', text: 'text-orange-800' },
  ABSENT: { bg: 'bg-slate-100', text: 'text-slate-800' },
  EARLY_LEAVE: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  DEFAULT: { bg: 'bg-blue-100', text: 'text-blue-800' },
}

// Returns Monday of the current week
const getWeekMonday = (): Date => {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, ...
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Returns Saturday of the current week
const getWeekSaturday = (): Date => {
  const monday = getWeekMonday()
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  saturday.setHours(0, 0, 0, 0)
  return saturday
}

export function WarningsScreen() {
  const { auth } = useAuth()
  const [startDate, setStartDate] = useState(getWeekMonday())    // ← Monday of current week
  const [endDate, setEndDate] = useState(getWeekSaturday())      // ← Saturday of current week
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)
  const [data, setData] = useState<WarningRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWarningsData = async () => {
      if (!auth?.token) {
        setError('Authentication token not available')
        return
      }

      setLoading(true)
      setError(null)
      try {
        const startYear = startDate.getFullYear()
        const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
        const startDay = String(startDate.getDate()).padStart(2, '0')
        const startDateString = `${startYear}-${startMonth}-${startDay}`

        const endYear = endDate.getFullYear()
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
        const endDay = String(endDate.getDate()).padStart(2, '0')
        const endDateString = `${endYear}-${endMonth}-${endDay}`

        const response = await fetch(
          `http://localhost:8080/api/warnings/by-range?from=${startDateString}&to=${endDateString}`,
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
        const transformedData: WarningRecord[] = apiData.map((item) => ({
          id: item.id,
          employeeName: item.employeeName,
          warningDate: item.warningDate,
          lateMinutes: item.lateMinutes,
          penaltyApplied: item.penaltyApplied,
          warningType: item.warningType,
          expectedTime: item.expectedTime,
          actualTime: item.actualTime,
        }))
        setData(transformedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        console.error('Error fetching warnings data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWarningsData()
  }, [startDate, endDate, auth?.token])

  const filteredData = data.filter((record) =>
    selectedEmployee ? record.employeeName === selectedEmployee : true
  )

  const employees = useMemo(() => {
    const uniqueEmployees = Array.from(new Set(data.map((r) => r.employeeName)))
    return [
      { value: '', label: 'All Employees' },
      ...uniqueEmployees.map((emp) => ({ value: emp, label: emp })),
    ]
  }, [data])

  const getWarningBadge = (warningType: string) => {
    const badge = WARNING_TYPE_BADGES[warningType] || WARNING_TYPE_BADGES.DEFAULT
    return badge
  }

  return (
    <div className="w-full space-y-6 px-6 py-8">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Employee</Label>
            <SearchableComboBox
              options={employees}
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              placeholder="Select employee..."
              searchPlaceholder="Search employees..."
            />
          </div>
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Start Date</Label>
            <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-2 py-1 justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 text-sm"
                >
                  <CalendarIcon className="mr-1 h-3 w-3 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-900 font-medium text-sm">
                    {startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date)
                    setIsStartCalendarOpen(false)
                  }}
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">End Date</Label>
            <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-2 py-1 justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 text-sm"
                >
                  <CalendarIcon className="mr-1 h-3 w-3 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-900 font-medium text-sm">
                    {endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date)
                    setIsEndCalendarOpen(false)
                  }}
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
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
          <h2 className="text-lg font-semibold text-slate-900">Warning Records</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading warning data...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left font-semibold text-slate-900 border-r border-slate-200">
                    Employee Name
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-900 border-r border-slate-200">
                    Warning Date
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">
                    Expected Time
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">
                    Actual Time
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">
                    Late Minutes
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-slate-900 border-r border-slate-200">
                    Penalty Applied
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-900">
                    Warning Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => {
                    const badgeStyle = getWarningBadge(record.warningType)
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-slate-200 hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 border-r border-slate-200">
                          {record.employeeName}
                        </td>
                        <td className="px-6 py-4 text-slate-700 border-r border-slate-200">
                          {record.warningDate}
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-200">
                          <span className="text-slate-700 font-medium">{record.expectedTime}</span>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-200">
                          <span className="text-slate-700 font-medium">{record.actualTime}</span>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-200">
                          <span className="text-slate-700 font-medium">{record.lateMinutes}</span>
                        </td>
                        <td className="px-6 py-4 text-center border-r border-slate-200">
                          {record.penaltyApplied === 1 ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300">Yes</Badge>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${badgeStyle.bg} ${badgeStyle.text} border`}>
                            {record.warningType}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      No warning records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}