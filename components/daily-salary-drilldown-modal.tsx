"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface DailySalaryRecord {
  id: string
  employeeName: string
  workDate: string
  shift: string
  shiftTime: string
  presenceMinutes: number
  payableMinutes: number
  salaryMinutes: number
  warnings: number
  penaltyMinutes: number
  normalPay: number
  otPay: number
  allowance: number
  totalPay: number
}

interface DailySalaryDrilldownModalProps {
  record: DailySalaryRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DailySalaryDrilldownModal({
  record,
  open,
  onOpenChange,
}: DailySalaryDrilldownModalProps) {
  // Mock punch data
  const mockPunches = [
    { id: "1", type: "IN", time: "09:00", source: "Hikvision" },
    { id: "2", type: "OUT", time: "13:00", source: "Hikvision" },
    { id: "3", type: "IN", time: "14:00", source: "Manual" },
    { id: "4", type: "OUT", time: "18:05", source: "Hikvision" },
  ]

  // Mock OT data
  const mockOTData = [
    { shift: "Evening OT", workedMinutes: 60, payAmount: 300 },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Daily Salary Details - {record.employeeName} ({record.workDate})
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakdown">Salary Breakdown</TabsTrigger>
            <TabsTrigger value="timeline">Punch Timeline</TabsTrigger>
            <TabsTrigger value="ot">OT Breakdown</TabsTrigger>
          </TabsList>

          {/* Tab 1: Salary Breakdown */}
          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shift Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Shift</p>
                    <p className="font-medium">{record.shift}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Shift Time</p>
                    <p className="font-medium">{record.shiftTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Grace Minutes</p>
                    <p className="font-medium">5</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Actual First IN</p>
                    <p className="font-medium">09:02</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Late Minutes</p>
                    <p className="font-medium text-yellow-600">2</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Warning Raised</p>
                    <Badge variant={record.warnings > 0 ? "destructive" : "outline"}>
                      {record.warnings > 0 ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salary Calculation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Presence Minutes</span>
                  <span className="font-medium">{record.presenceMinutes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payable Minutes (after break/lunch)</span>
                  <span className="font-medium">{record.payableMinutes}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Salary Minutes (after penalty)</span>
                  <span>{record.salaryMinutes}</span>
                </div>
                <div className="flex justify-between text-gray-500 mt-2">
                  <span>Penalty Applied</span>
                  <span>{record.penaltyMinutes} minutes</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pay Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Normal Pay</span>
                  <span className="font-medium">₹{record.normalPay}</span>
                </div>
                <div className="flex justify-between">
                  <span>OT Pay</span>
                  <span className="font-medium">₹{record.otPay}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowance</span>
                  <span className="font-medium">₹{record.allowance}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total Pay</span>
                  <span>₹{record.totalPay.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Punch Timeline */}
          <TabsContent value="timeline" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPunches.map((punch) => (
                  <TableRow key={punch.id}>
                    <TableCell>
                      <Badge variant={punch.type === "IN" ? "default" : "outline"}>
                        {punch.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{punch.time}</TableCell>
                    <TableCell>{punch.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button className="w-full">Edit Punches</Button>
          </TabsContent>

          {/* Tab 3: OT Breakdown */}
          <TabsContent value="ot" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT Shift</TableHead>
                  <TableHead className="text-right">Worked Minutes</TableHead>
                  <TableHead className="text-right">Pay Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOTData.map((ot, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{ot.shift}</TableCell>
                    <TableCell className="text-right">{ot.workedMinutes}</TableCell>
                    <TableCell className="text-right">₹{ot.payAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
