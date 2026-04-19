import { Mic, MicOff, Loader as Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EngineStatus } from '@/lib/stt-engine'

interface RecordingButtonProps {
  status: EngineStatus
  onStart: () => void
  onStop: () => void
}

export function RecordingButton({ status, onStart, onStop }: RecordingButtonProps) {
  const isListening = status === 'listening'
  const isLoadingModel = status === 'loading'
  const isProcessing = status === 'processing'
  const disabled = isLoadingModel || isProcessing

  const title = isLoadingModel
    ? 'Loading model...'
    : isProcessing
      ? 'Transcribing audio...'
      : isListening
        ? 'Stop recording'
        : 'Start recording'

  return (
    <Button
      size="lg"
      variant={isListening ? 'destructive' : 'default'}
      className={`relative h-16 w-16 rounded-full ${isListening ? 'animate-pulse' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={isListening ? onStop : onStart}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {disabled ? (
        <Loader2 className="size-6 animate-spin" />
      ) : isListening ? (
        <MicOff className="size-6" />
      ) : (
        <Mic className="size-6" />
      )}
    </Button>
  )
}
