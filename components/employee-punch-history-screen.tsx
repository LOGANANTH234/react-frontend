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
import { format, parseISO, startOfDay } from 'date-fns'
import { useAuth } from '@/lib/contexts/auth-context'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MultiViewCalendar } from './multi-view-calendar'

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

const PUNCH_SOURCES = ['HIKVISION', 'MANUAL', 'HIKVISION_MANUAL', 'SYSTEM_AUTO'] as const

export default function EmployeePunchHistoryScreen() {
  const { auth } = useAuth()
  const hasModuleAccess = useHasModule(MODULES.VIEW_EDIT_PUNCHES)

  const today = new Date().toISOString().split('T')[0]

  const [punchData, setPunchData]                     = useState<PunchData[]>([])
  const [uniqueEmployeeNames, setUniqueEmployeeNames] = useState<string[]>([])

  // Client-side filters
  const [employeeName, setEmployeeName] = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  // Date filters — trigger server re-fetch
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate]     = useState(today)

  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen]     = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const startDateObj = startOfDay(parseISO(startDate))
  const endDateObj   = startOfDay(parseISO(endDate))

  // ── server fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth?.token || !startDate || !endDate) return

    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const url =
          `http://3.109.152.136:8080/api/punch/history` +
          `?startDate=${startDate}&endDate=${endDate}&page=0&size=1000000`

        const res = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
        if (!res.ok) throw new Error(`API error: ${res.statusText}`)

        const page = await res.json()

        const mapped: PunchData[] = (page.content || []).map((p: any) => ({
          id:           p.id?.toString() || Date.now().toString(),
          employeeId:   p.employeeId?.toString() || '',
          employeeName: p.employeeName || 'Unknown',
          date:         p.attendanceDate || p.date || '',
          time:         p.punchTime || p.time || '',
          type:         p.punchType === 'IN' || p.type === 'IN' ? 'IN' : 'OUT',
          source:       p.source || 'SYSTEM_AUTO',
          shift:        p.shift || 'Morning',
          status:       p.status || 'valid',
          note:         p.note || '',
        }))

        setPunchData(mapped)
        setUniqueEmployeeNames(Array.from(new Set(mapped.map(p => p.employeeName))).sort())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch punch data')
        setPunchData([])
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [auth, startDate, endDate])

  // ── client-side filter ─────────────────────────────────────────────────────
  const filteredPunches = useMemo(() => {
    return punchData.filter(p => {
      if (employeeName !== 'all' && p.employeeName !== employeeName) return false
      if (typeFilter   !== 'all' && p.type         !== typeFilter)   return false
      if (sourceFilter !== 'all' && p.source        !== sourceFilter) return false
      return true
    })
  }, [punchData, employeeName, typeFilter, sourceFilter])

  if (!hasModuleAccess) {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50">
          <div className="p-4 text-amber-800">You do not have access to this module.</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Employee Punch History</h2>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">

          {/* Employee */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Employee</Label>
            <Select value={employeeName} onValueChange={setEmployeeName}>
              <SelectTrigger className="h-9 w-44 text-sm bg-white border-slate-300">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueEmployeeNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Start Date</Label>
            <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 py-1 justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 text-sm">
                  <CalendarIcon className="mr-1 h-3 w-3 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-900 font-medium text-sm">{format(startDateObj, 'MMM dd, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={startDateObj}
                  onSelect={(date) => { setStartDate(format(date, 'yyyy-MM-dd')); setIsStartCalendarOpen(false) }}
                  fromYear={2020} toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">End Date</Label>
            <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 py-1 justify-start text-left font-normal bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-900 text-sm">
                  <CalendarIcon className="mr-1 h-3 w-3 text-slate-600 flex-shrink-0" />
                  <span className="text-slate-900 font-medium text-sm">{format(endDateObj, 'MMM dd, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <MultiViewCalendar
                  selected={endDateObj}
                  onSelect={(date) => { setEndDate(format(date, 'yyyy-MM-dd')); setIsEndCalendarOpen(false) }}
                  fromYear={2020} toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Type */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-32 text-sm bg-white border-slate-300">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="IN">IN</SelectItem>
                <SelectItem value="OUT">OUT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-1 flex-shrink-0">
            <Label className="text-slate-700 font-semibold text-sm">Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 w-44 text-sm bg-white border-slate-300">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {PUNCH_SOURCES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total record count */}
          {!isLoading && filteredPunches.length > 0 && (
            <div className="space-y-1 flex-shrink-0">
              <Label className="text-slate-700 font-semibold text-sm">Total Records</Label>
              <div className="h-9 flex items-center px-3 rounded-md border border-slate-300 bg-slate-50">
                <span className="text-sm font-bold text-slate-800">{filteredPunches.length.toLocaleString()}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 text-red-800">{error}</div>
        </Card>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-900">Punch Records</h2>
        </div>
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
                  <TableCell colSpan={5} className="text-center py-8">
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
                        punch.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {punch.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono py-4">{punch.time || 'N/A'}</TableCell>
                    <TableCell className="py-4">
                      <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {punch.source}
                      </span>
                    </TableCell>
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
      </div>
    </div>
  )
}