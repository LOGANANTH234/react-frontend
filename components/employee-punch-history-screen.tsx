'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useHasModule, MODULES } from '@/lib/permission-utils'
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
import { Loader2, CalendarIcon } from 'lucide-react'
import { mockEmployees } from '@/lib/mock-employees'
import { format, parseISO, startOfDay } from 'date-fns'
import { useAuth } from '@/lib/contexts/auth-context'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MultiViewCalendar } from './multi-view-calendar'
import { Input } from '@/components/ui/input'

interface PunchData {
  id: string
  employeeId: string
  employeeName: string
  type: 'IN' | 'OUT'
  time: string
  date: string
  shift: string
  source: string
  note?: string
  status: 'valid' | 'missing-out' | 'overlap' | 'edited'
}

interface Filters {
  employeeName: string  // 'all' means no filter (All Employees)
  startDate: string
  endDate: string
}

export default function EmployeePunchHistoryScreen() {
  const { auth } = useAuth()
  const hasModuleAccess = useHasModule(MODULES.VIEW_EDIT_PUNCHES)

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [punchData, setPunchData] = useState<PunchData[]>([])
  const [uniqueEmployeeNames, setUniqueEmployeeNames] = useState<string[]>([])
  const [filters, setFilters] = useState<Filters>({
    employeeName: 'all',  // ← default: All Employees
    startDate: today,     // ← default: today
    endDate: today,       // ← default: today
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStartDateCalendarOpen, setIsStartDateCalendarOpen] = useState(false)
  const [isEndDateCalendarOpen, setIsEndDateCalendarOpen] = useState(false)

  const employees = mockEmployees

  const startDateObj = startOfDay(parseISO(filters.startDate))
  const endDateObj = startOfDay(parseISO(filters.endDate))

  const fetchPunchDataByRange = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!auth || !auth.token) {
        setError('Unauthorized – Please login again.')
        return
      }

      const token = auth.token
      const url = `http://3.109.152.136:8080/api/punch/history?startDate=${filters.startDate}&endDate=${filters.endDate}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      const punchesWithEmployeeNames: PunchData[] = (data || []).map((punch: any) => ({
        id: punch.id?.toString() || Date.now().toString(),
        employeeId: punch.employeeId?.toString() || '',
        employeeName: punch.employeeName || 'Unknown',
        date: punch.attendanceDate || punch.date || '',
        time: punch.punchTime || punch.time || '',
        type: punch.punchType === 'IN' || punch.type === 'IN' ? 'IN' : 'OUT',
        source: punch.source || 'System',
        shift: punch.shift || 'Morning',
        status: punch.status || 'valid',
        note: punch.note || '',
      }))

      setPunchData(punchesWithEmployeeNames)

      const uniqueNames = Array.from(new Set(punchesWithEmployeeNames.map(p => p.employeeName)))
        .sort((a, b) => a.localeCompare(b))
      setUniqueEmployeeNames(uniqueNames)

      // ── No auto-select: keep 'all' as the default so all employees show ──

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch punch data'
      setError(errorMsg)
      setPunchData([])
      setUniqueEmployeeNames([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (auth && auth.token && filters.startDate && filters.endDate) {
      fetchPunchDataByRange()
    }
  }, [auth, filters.startDate, filters.endDate])

  const handleStartDateSelect = (date: Date) => {
    const newDateStr = format(date, 'yyyy-MM-dd')
    setFilters(prev => ({ ...prev, startDate: newDateStr }))
    setIsStartDateCalendarOpen(false)
  }

  const handleEndDateSelect = (date: Date) => {
    const newDateStr = format(date, 'yyyy-MM-dd')
    setFilters(prev => ({ ...prev, endDate: newDateStr }))
    setIsEndDateCalendarOpen(false)
  }

  const convertTo12Hour = (time: string): string => {
    if (time === '--' || !time) return '--'
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // 'all' → show all employees, otherwise filter by name
  const filteredPunches = useMemo(() => {
    return punchData.filter(punch => {
      if (filters.employeeName !== 'all' && punch.employeeName !== filters.employeeName) return false
      return true
    })
  }, [punchData, filters.employeeName])

  if (!hasModuleAccess) {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50">
          <div className="p-4 text-amber-800">
            You do not have access to this module.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Employee Punch History</h2>
        <p className="text-muted-foreground mt-1">View employee punch records for a date range (Read-only)</p>
      </div>

      {/* Filters */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Filters</h2>

        {/* Labels row */}
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">Employee</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">Start Date</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">End Date</span>
        </div>

        {/* Inputs row */}
        <div className="flex items-center gap-3">
          {/* Employee Filter — defaults to All Employees */}
          <div className="w-48">
            <Select
              value={filters.employeeName}
              onValueChange={(value) => setFilters(prev => ({ ...prev, employeeName: value }))}
            >
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueEmployeeNames.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date Filter */}
          <div className="w-48">
            <Popover open={isStartDateCalendarOpen} onOpenChange={setIsStartDateCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 text-sm w-full justify-start gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{format(startDateObj, 'MMM dd, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={startDateObj}
                  onSelect={handleStartDateSelect}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date Filter */}
          <div className="w-48">
            <Popover open={isEndDateCalendarOpen} onOpenChange={setIsEndDateCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 text-sm w-full justify-start gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{format(endDateObj, 'MMM dd, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={endDateObj}
                  onSelect={handleEndDateSelect}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 text-red-800">{error}</div>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  </TableCell>
                </TableRow>
              ) : filteredPunches.length > 0 ? (
                filteredPunches.map(punch => (
                  <TableRow key={punch.id} className="h-14">
                    <TableCell className="font-medium py-4">{punch.employeeName}</TableCell>
                    <TableCell className="text-sm py-4">
                      {punch.date ? format(parseISO(punch.date), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        punch.type === 'IN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {punch.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono py-4">{punch.time || 'N/A'}</TableCell>
                    <TableCell className="text-sm py-4">{punch.source}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No punch records found for the selected criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}