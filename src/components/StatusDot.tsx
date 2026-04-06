import { connectionTone } from '../lib/utils'
import type { ConnectionStatus } from '../lib/types'

interface StatusDotProps {
  status: ConnectionStatus
}

export function StatusDot({ status }: StatusDotProps) {
  return <span className={`h-2.5 w-2.5 rounded-full ${connectionTone(status)}`} />
}
