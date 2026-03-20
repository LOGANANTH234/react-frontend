'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { MultiViewCalendar } from '@/components/multi-view-calendar'

interface AttendanceSummaryRecord {
  id: number
  employeeName: string
  attendanceDate: string
  firstIn: string
  lastOut: string
  workedMinutes: number
  breakMinutes: number
}

interface ApiResponse {
  id: number
  employeeName: string
  attendanceDate: string
  firstIn: string
  lastOut: string
  workedMinutes: number
  breakMinutes: number
}

export default function DailyAttendanceSummaryScreen() {
  const { auth } = useAuth()
  const [summaryData, setSummaryData] = useState<AttendanceSummaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const [filters, setFilters] = useState({
    employeeName: 'all',
    startDate: todayStr,  // ← default: today
    endDate: todayStr,    // ← default: today
  })

  const [isStartDateCalendarOpen, setIsStartDateCalendarOpen] = useState(false)
  const [isEndDateCalendarOpen, setIsEndDateCalendarOpen] = useState(false)

  const startDateObj = parseISO(filters.startDate)
  const endDateObj = parseISO(filters.endDate)

  const uniqueEmployeeNames = Array.from(new Set(summaryData.map(r => r.employeeName))).sort()

  const filteredData = summaryData.filter(record => {
    if (filters.employeeName !== 'all' && record.employeeName !== filters.employeeName) {
      return false
    }
    return true
  })

  const fetchSummaryData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!auth || !auth.token) {
        setError('Unauthorized – Please login again.')
        return
      }

      const token = auth.token
      const url = `http://3.109.152.136:3000/api/live-attendance/summary-history?startDate=${filters.startDate}&endDate=${filters.endDate}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const apiData: ApiResponse[] = await response.json()
      const transformedData: AttendanceSummaryRecord[] = apiData.map((item) => ({
        id: item.id,
        employeeName: item.employeeName,
        attendanceDate: item.attendanceDate,
        firstIn: item.firstIn,
        lastOut: item.lastOut,
        workedMinutes: item.workedMinutes,
        breakMinutes: item.breakMinutes,
      }))

      setSummaryData(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (auth && auth.token && filters.startDate && filters.endDate) {
      fetchSummaryData()
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

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return 'N/A'
    try {
      const date = parseISO(dateTimeStr)
      return format(date, 'MMM dd, yyyy HH:mm')
    } catch {
      return dateTimeStr
    }
  }

  const formatMinutesToHours = (minutes: number) => {
    if (minutes === 0) return '0'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Filters */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Filters</h2>

        {/* Labels row */}
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">Employee</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">From Date</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">To Date</span>
        </div>

        {/* Inputs row */}
        <div className="flex items-center gap-3">
          {/* Employee Filter */}
          <div className="w-48">
            <Select value={filters.employeeName} onValueChange={(value) => setFilters(prev => ({ ...prev, employeeName: value }))}>
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

      {/* Error display */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Employee Name</TableHead>
              <TableHead>Attendance Date</TableHead>
              <TableHead>First In</TableHead>
              <TableHead>Last Out</TableHead>
              <TableHead className="text-right">Worked Minutes</TableHead>
              <TableHead className="text-right">Break Minutes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-slate-500">Loading attendance summary...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length > 0 ? (
              filteredData.map((record, index) => (
                <TableRow key={record.id || index} className="h-14">
                  <TableCell className="font-medium py-4">{record.employeeName}</TableCell>
                  <TableCell className="py-4">{record.attendanceDate ? format(parseISO(record.attendanceDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                  <TableCell className="py-4">{formatDateTime(record.firstIn)}</TableCell>
                  <TableCell className="py-4">{formatDateTime(record.lastOut)}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{record.workedMinutes}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{record.breakMinutes}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No attendance records found for the selected criteria
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}