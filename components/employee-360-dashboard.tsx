"use client"

import { useState, useEffect } from "react"
import { Search, X, ShuffleIcon, LucideTimerOff as LucideTimerOffIcon, IndianRupeeIcon, Loader2 } from "lucide-react"
import type { Employee } from "@/lib/employee-types"
import { Badge } from "@/components/ui/badge"
import { AttendanceAnalyticsPanel } from "./attendance-analytics-panel"

const mapApiEmployeeToEmployee = (apiEmployee: any): Employee => {
  return {
    id: apiEmployee.id,
    name: apiEmployee.employeeName,
    employeeId: apiEmployee.employeeId,
    phone: apiEmployee.phone,
    email: apiEmployee.email,
    pan: apiEmployee.pan,
    aadhaar: apiEmployee.aadhaar,
    profileImage: apiEmployee.imageUrl,
    gender: apiEmployee.gender === "MALE" ? "Male" : apiEmployee.gender === "FEMALE" ? "Female" : "Other",
    role: apiEmployee.role,
    status: apiEmployee.status === "ACTIVE" ? "Active" : "Inactive",
    regularShifts: apiEmployee.regularShifts.map((shift: any) => ({
      id: shift.shiftId.toString(),
      shiftName: shift.shiftName,
      amountType: shift.amountType,
      amount: shift.amount,
      extraAllowance: shift.extraAllowance,
    })),
    overtimeShifts: apiEmployee.overtimeShifts.map((shift: any) => ({
      id: shift.shiftId.toString(),
      shiftName: shift.shiftName,
      amountType: shift.amountType,
      amount: shift.amount,
      extraAllowance: shift.extraAllowance,
    })),
    salaryConfig: {
      frequency: apiEmployee.salaryFrequency === "Monthly" ? "By Month" : "By Day",
      workdayPolicy: apiEmployee.workdayPolicy.includes("All Days")
        ? "Include All Days"
        : apiEmployee.workdayPolicy.includes("Sundays")
          ? "Exclude Sundays"
          : "Exclude Saturdays & Sundays",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function Employee360Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth")!).token : null
        const response = await fetch("http://3.109.152.136:8080/api/employees/getAllEmployees", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch employees")
        }

        const data = await response.json()
        const mappedEmployees = data.map(mapApiEmployeeToEmployee)
        setEmployees(mappedEmployees)
        setError(null)
      } catch (err) {
        console.error("Error fetching employees:", err)
        setError("Failed to load employees. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery)

    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const calculateEarnings = (emp: Employee) => {
    const regularShifts = emp.regularShifts || []
    const overtimeShifts = emp.overtimeShifts || []

    const regularEarnings = regularShifts.reduce((sum, shift) => {
      const dailyAmount = shift.amountType === "Per Day" ? shift.amount : shift.amount * 5 // Assume 5 shifts per week
      const allowance = shift.extraAllowance || 0
      return sum + (dailyAmount * 22 + allowance * 22) // 22 working days per month
    }, 0)

    const overtimeEarnings = overtimeShifts.reduce((sum, shift) => {
      return sum + shift.amount * 4 // Assume 4 OT shifts per month
    }, 0)

    return {
      regular: regularEarnings,
      overtime: overtimeEarnings,
      total: regularEarnings + overtimeEarnings,
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Employee 360° Dashboard</h1>
          <p className="text-sm text-muted-foreground">Select an employee to view details and attendance analytics</p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-lg font-medium text-foreground">Loading employees...</p>
            <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch the data</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Search Bar */}
            <div className="mb-6 relative">
              <div className="flex gap-2 items-center bg-card border border-input rounded-lg shadow-sm h-12 max-w-md">
                <div className="px-3 flex-shrink-0">
                  <Search size={20} className="text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, role, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-foreground text-sm focus:outline-none placeholder-muted-foreground min-w-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-3 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Employee List Table */}
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Register Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">PAN</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Aadhaar</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          onClick={() => setSelectedEmployee(employee)}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                            selectedEmployee?.id === employee.id ? "bg-blue-50 dark:bg-blue-950" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                                {employee.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{employee.name}</div>
                                <div className="text-xs text-muted-foreground">{employee.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground font-medium">{employee.role}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground">{formatDate(employee.createdAt)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground">{employee.email || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground font-mono">{employee.pan || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground font-mono">{employee.aadhaar || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={employee.status === "Active" ? "default" : "secondary"}
                              className={
                                employee.status === "Active"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300"
                                  : "bg-red-100 text-red-800 hover:bg-red-100 border-red-300"
                              }
                            >
                              {employee.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
          </>
        )}

        {selectedEmployee && (
          <div className="mt-12 pt-8 border-t border-border space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedEmployee.name}</h2>
                    <p className="text-sm text-muted-foreground">Role: {selectedEmployee.role}</p>
                    <p className="text-sm text-muted-foreground">
                      Active Since: {formatDate(selectedEmployee.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={selectedEmployee.status === "Active" ? "default" : "secondary"}
                  className={
                    selectedEmployee.status === "Active"
                      ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300 h-fit"
                      : "bg-red-100 text-red-800 hover:bg-red-100 border-red-300 h-fit"
                  }
                >
                  {selectedEmployee.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* LEFT PANEL (40%) - Employee Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* Shift Timing */}
                {selectedEmployee.regularShifts.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ShuffleIcon size={16} className="text-green-600 dark:text-green-400" />
                      Shift Timing
                    </p>
                    <div className="space-y-2">
                      {selectedEmployee.regularShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700"
                        >
                          <p className="text-sm font-medium text-foreground">{shift.shiftName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ₹{shift.amount}/{shift.amountType}
                            {shift.extraAllowance ? ` + ₹${shift.extraAllowance}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overtime Details */}
                {selectedEmployee.overtimeShifts.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <LucideTimerOffIcon size={16} className="text-orange-600 dark:text-orange-400" />
                      Overtime Details
                    </p>
                    <div className="space-y-2">
                      {selectedEmployee.overtimeShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-700"
                        >
                          <p className="text-sm font-medium text-foreground">{shift.shiftName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ₹{shift.amount}/{shift.amountType}
                            {shift.extraAllowance ? ` + ₹${shift.extraAllowance}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Salary Frequency */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <IndianRupeeIcon size={16} className="text-pink-600 dark:text-pink-400" />
                    Salary & Workday Policy
                  </p>
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-700">
                      <p className="text-xs text-muted-foreground">Frequency</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEmployee.salaryConfig?.frequency || "Not Set"}
                      </p>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-700">
                      <p className="text-xs text-muted-foreground">Workday Policy</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEmployee.salaryConfig?.workdayPolicy || "Not Set"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <IndianRupeeIcon size={16} className="text-blue-600 dark:text-blue-400" />
                    Earnings Summary
                  </p>
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-muted-foreground">Regular Earnings</p>
                      <p className="text-lg font-bold text-foreground">
                        ₹{calculateEarnings(selectedEmployee).regular.toLocaleString()}
                      </p>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-muted-foreground">OT Earnings</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        ₹{calculateEarnings(selectedEmployee).overtime.toLocaleString()}
                      </p>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-700">
                      <p className="text-xs text-muted-foreground">Net Pay</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ₹{calculateEarnings(selectedEmployee).total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Last 10 Attendance Records</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2">Date</th>
                          <th className="text-left py-2 px-2">In</th>
                          <th className="text-left py-2 px-2">Out</th>
                          <th className="text-left py-2 px-2">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground">
                        {[
                          { date: "2025-01-20", in: "09:00", out: "18:00", hours: "9h" },
                          { date: "2025-01-19", in: "08:45", out: "17:45", hours: "9h" },
                          { date: "2025-01-18", in: "09:15", out: "18:15", hours: "9h" },
                          { date: "2025-01-17", in: "09:00", out: "18:00", hours: "9h" },
                          { date: "2025-01-16", in: "Absent", out: "—", hours: "0h" },
                          { date: "2025-01-15", in: "09:00", out: "20:00", hours: "11h" },
                          { date: "2025-01-14", in: "09:00", out: "18:00", hours: "9h" },
                          { date: "2025-01-13", in: "08:30", out: "17:45", hours: "9.25h" },
                          { date: "2025-01-12", in: "Holiday", out: "—", hours: "0h" },
                          { date: "2025-01-11", in: "09:00", out: "18:00", hours: "9h" },
                        ].map((record, idx) => (
                          <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-2">{record.date}</td>
                            <td className="py-2 px-2">{record.in}</td>
                            <td className="py-2 px-2">{record.out}</td>
                            <td className="py-2 px-2 font-medium">{record.hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL (60%) - Attendance Analytics */}
              <div className="lg:col-span-3">
                <AttendanceAnalyticsPanel employeeId={selectedEmployee.id} employeeName={selectedEmployee.name} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
