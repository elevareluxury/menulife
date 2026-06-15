import { Navigate } from 'react-router-dom'
import { usePlanGuard } from '@/hooks/usePlanGuard'

type Feature = Parameters<ReturnType<typeof usePlanGuard>['hasFeature']>[0]

interface RequirePlanProps {
  feature: Feature
  children: React.ReactNode
}

export function RequirePlan({ feature, children }: RequirePlanProps) {
  const { hasFeature } = usePlanGuard()
  if (!hasFeature(feature)) return <Navigate to="/dashboard/hub" replace />
  return <>{children}</>
}
