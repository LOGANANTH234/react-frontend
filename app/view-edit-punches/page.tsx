'use client'

import { RouteGuard } from '@/components/route-guard'
import ViewEditPunchesScreen from '@/components/view-edit-punches-screen'

export default function ViewEditPunchesPage() {
  return (
    <RouteGuard>
      <ViewEditPunchesScreen />
    </RouteGuard>
  )
}
