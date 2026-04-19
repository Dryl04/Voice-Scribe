import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff } from 'lucide-react'
import type { EngineStatus } from '@/lib/stt-engine'

interface StatusIndicatorProps {
  status: EngineStatus
  isOnline: boolean
  loadProgress: number
}

const STATUS_LABELS: Record<EngineStatus, string> = {
  idle: 'Ready',
  loading: 'Loading model...',
  ready: 'Ready',
  listening: 'Listening...',
  processing: 'Processing...',
  error: 'Error',
}

export function StatusIndicator({ status, isOnline, loadProgress }: StatusIndicatorProps) {
  const label = status === 'loading' ? `Loading... ${Math.round(loadProgress)}%` : STATUS_LABELS[status]

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={status === 'listening' ? 'default' : status === 'error' ? 'destructive' : 'outline'}
      >
        {status === 'listening' && (
          <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-destructive" />
        )}
        {label}
      </Badge>
      <Badge variant="outline" className="gap-1">
        {isOnline ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    </div>
  )
}
