import { STT_MODELS, type STTModel } from './stt-models'

type TranscriptCallback = (text: string, isFinal: boolean) => void
type StatusCallback = (status: EngineStatus) => void
type ProgressCallback = (progress: number) => void

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'listening' | 'processing' | 'error'

let currentPipeline: ReturnType<typeof createWhisperPipeline> | null = null
let loadedModelId: string | null = null

async function createWhisperPipeline(modelId: string, onProgress?: ProgressCallback) {
  const { pipeline } = await import('@huggingface/transformers')
  return pipeline('automatic-speech-recognition', modelId, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    progress_callback: (data: any) => {
      if (data?.progress !== undefined && onProgress) {
        onProgress(data.progress)
      }
    },
  })
}

export class STTEngine {
  private model: STTModel
  private onTranscript: TranscriptCallback
  private onStatus: StatusCallback
  private onProgress?: ProgressCallback
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private recognition: SpeechRecognition | null = null
  private status: EngineStatus = 'idle'
  private stream: MediaStream | null = null

  constructor(
    modelId: string,
    onTranscript: TranscriptCallback,
    onStatus: StatusCallback,
    onProgress?: ProgressCallback
  ) {
    this.model = STT_MODELS.find((m) => m.id === modelId) ?? STT_MODELS[0]
    this.onTranscript = onTranscript
    this.onStatus = onStatus
    this.onProgress = onProgress
  }

  private setStatus(status: EngineStatus) {
    this.status = status
    this.onStatus(status)
  }

  async initialize(): Promise<void> {
    if (this.model.type === 'web-speech') {
      this.setStatus('ready')
      return
    }

    if (loadedModelId === this.model.modelId && currentPipeline) {
      this.setStatus('ready')
      return
    }

    if (currentPipeline && loadedModelId !== this.model.modelId) {
      try {
        const prev = await currentPipeline
        ;(prev as unknown as { dispose?: () => Promise<void> })?.dispose?.()
      } catch {
        // ignore
      }
      currentPipeline = null
      loadedModelId = null
    }

    this.setStatus('loading')
    try {
      currentPipeline = createWhisperPipeline(this.model.modelId, this.onProgress)
      await currentPipeline
      loadedModelId = this.model.modelId
      this.setStatus('ready')
    } catch {
      this.setStatus('error')
      throw new Error(`Failed to load model: ${this.model.name}`)
    }
  }

  async start(): Promise<void> {
    if (this.status !== 'ready' && this.status !== 'idle') {
      await this.initialize()
    }

    if (this.model.type === 'web-speech' && !STTEngine.isWebSpeechSupported()) {
      this.setStatus('error')
      throw new Error('Web Speech API is not supported in this browser. Try Chrome or Edge, or select a Whisper model instead.')
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    if (this.model.type === 'web-speech') {
      this.startWebSpeech()
    } else {
      this.startWhisper(this.stream)
    }
  }

  static isWebSpeechSupported(): boolean {
    return typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  private startWebSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      this.setStatus('error')
      throw new Error('Web Speech API is not supported in this browser. Try Chrome or Edge, or select a Whisper model instead.')
    }

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = navigator.language || 'en-US'

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          finalText += (finalText ? ' ' : '') + text.trim()
        } else {
          interimText += (interimText ? ' ' : '') + text.trim()
        }
      }
      if (finalText) {
        this.onTranscript(finalText, true)
      }
      this.onTranscript(interimText, false)
    }

    this.recognition.onerror = () => {
      this.setStatus('error')
    }

    this.recognition.onend = () => {
      if (this.status === 'listening') {
        try {
          this.recognition?.start()
        } catch {
          // ignore
        }
      }
    }

    this.recognition.start()
    this.setStatus('listening')
  }

  private startWhisper(stream: MediaStream) {
    this.audioChunks = []
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    const supported = candidates.find((t) =>
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)
    )
    this.mediaRecorder = supported
      ? new MediaRecorder(stream, { mimeType: supported })
      : new MediaRecorder(stream)

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data)
      }
    }

    this.mediaRecorder.onstop = async () => {
      if (this.audioChunks.length === 0) return
      this.setStatus('processing')

      try {
        const blobType = this.mediaRecorder?.mimeType || 'audio/webm'
        const audioBlob = new Blob(this.audioChunks, { type: blobType })
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioContext = new AudioContext({ sampleRate: 16000 })
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const float32 = audioBuffer.getChannelData(0)

        if (currentPipeline) {
          const pipe = await currentPipeline
          const result = await (pipe as (input: Float32Array) => Promise<{ text: string }>)(float32)
          this.onTranscript(result.text.trim(), true)
        }
      } catch {
        this.setStatus('error')
      }

      if (this.status === 'processing') {
        this.setStatus('idle')
      }
      this.mediaRecorder = null
    }

    this.mediaRecorder.start(5000)
    this.setStatus('listening')
  }

  stop() {
    const hasPendingWhisper =
      this.mediaRecorder !== null && this.mediaRecorder.state !== 'inactive'

    if (this.recognition) {
      this.recognition.onend = null
      this.recognition.abort()
      this.recognition = null
    }

    if (hasPendingWhisper && this.mediaRecorder) {
      this.mediaRecorder.stop()
    } else {
      this.mediaRecorder = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }

    if (!hasPendingWhisper && this.status !== 'processing') {
      this.setStatus('idle')
    }
  }

  getStatus() {
    return this.status
  }
}
