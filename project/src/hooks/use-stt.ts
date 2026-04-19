import { useState, useRef, useCallback } from 'react'
import { STTEngine, type EngineStatus } from '@/lib/stt-engine'
import { DEFAULT_MODEL_ID } from '@/lib/stt-models'

export function useSTT() {
  const [status, setStatus] = useState<EngineStatus>('idle')
  const [modelId, setModelId] = useState(() => {
    return localStorage.getItem('stt-model') ?? DEFAULT_MODEL_ID
  })
  const [loadProgress, setLoadProgress] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const engineRef = useRef<STTEngine | null>(null)

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript((prev) => {
        const separator = prev.length > 0 ? ' ' : ''
        return prev + separator + text
      })
      setInterimText('')
    } else {
      setInterimText(text)
    }
  }, [])

  const handleStatus = useCallback((newStatus: EngineStatus) => {
    setStatus(newStatus)
  }, [])

  const handleProgress = useCallback((progress: number) => {
    setLoadProgress(progress)
  }, [])

  const startListening = useCallback(async () => {
    if (engineRef.current) {
      engineRef.current.stop()
    }

    const engine = new STTEngine(modelId, handleTranscript, handleStatus, handleProgress)
    engineRef.current = engine

    await engine.initialize()
    await engine.start()
  }, [modelId, handleTranscript, handleStatus, handleProgress])

  const stopListening = useCallback(() => {
    engineRef.current?.stop()
    setInterimText('')
  }, [])

  const changeModel = useCallback((newModelId: string) => {
    if (status === 'listening') {
      engineRef.current?.stop()
    }
    setModelId(newModelId)
    localStorage.setItem('stt-model', newModelId)
  }, [status])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimText('')
  }, [])

  return {
    status,
    modelId,
    loadProgress,
    transcript,
    interimText,
    startListening,
    stopListening,
    changeModel,
    clearTranscript,
    setTranscript,
  }
}
