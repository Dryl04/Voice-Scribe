import { useState, useEffect, useCallback } from 'react'
import { Mic, Settings, FileText, Keyboard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { ModeToggle } from '@/components/mode-toggle'
import { ModelSelector } from '@/components/model-selector'
import { ModelInfoPanel } from '@/components/model-info-panel'
import { RecordingButton } from '@/components/recording-button'
import { StatusIndicator } from '@/components/status-indicator'
import { FloatingNote } from '@/components/floating-note'
import { SavedNotesList } from '@/components/saved-notes-list'
import { useSTT } from '@/hooks/use-stt'
import { saveNote } from '@/lib/notes-service'
import { STT_MODELS } from '@/lib/stt-models'
import { Progress } from '@/components/ui/progress'

export function App() {
  const {
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
  } = useSTT()

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showFloatingNote, setShowFloatingNote] = useState(false)
  const [refreshNotes, setRefreshNotes] = useState(0)
  const [activeInput, setActiveInput] = useState<HTMLElement | null>(null)
  const [activeInputBase, setActiveInputBase] = useState('')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const isTextInput = (el: HTMLElement | null) => {
      if (!el) return false
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable
      )
    }

    const isInternalInput = (el: HTMLElement | null) => {
      if (!el) return false
      return el.closest('[data-voicescribe-internal]') !== null
    }

    const isFloatingInput = (el: HTMLElement | null) => {
      if (!el) return false
      return el.closest('[data-voicescribe-floating]') !== null
    }

    const evaluateFocus = () => {
      const focused = document.activeElement as HTMLElement | null
      if (focused && isFloatingInput(focused)) {
        return
      }
      if (focused && isTextInput(focused)) {
        if (isInternalInput(focused)) {
          setActiveInput(null)
        } else {
          const el = focused as HTMLInputElement | HTMLTextAreaElement
          const base = 'value' in el ? el.value : focused.textContent ?? ''
          setActiveInput(focused)
          setActiveInputBase(base)
        }
      } else {
        setActiveInput(null)
      }
    }

    document.addEventListener('focusin', evaluateFocus)
    document.addEventListener('focusout', evaluateFocus)
    evaluateFocus()
    return () => {
      document.removeEventListener('focusin', evaluateFocus)
      document.removeEventListener('focusout', evaluateFocus)
    }
  }, [])

  useEffect(() => {
    if (activeInput && transcript) {
      const separator = activeInputBase && !activeInputBase.endsWith(' ') ? ' ' : ''
      const merged = activeInputBase + separator + transcript
      const el = activeInput as HTMLInputElement | HTMLTextAreaElement
      if ('value' in el) {
        el.value = merged
        el.dispatchEvent(new Event('input', { bubbles: true }))
      } else if (activeInput.isContentEditable) {
        activeInput.textContent = merged
      }
    }
  }, [transcript, activeInput, activeInputBase])

  const handleStart = useCallback(async () => {
    try {
      await startListening()
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to start. Check microphone permissions.'
      toast.error(message)
    }
  }, [startListening])

  const handleStop = useCallback(() => {
    stopListening()
  }, [stopListening])

  const handleSaveNote = useCallback(() => {
    if (!transcript.trim()) return
    const model = STT_MODELS.find((m) => m.id === modelId)
    const words = transcript.trim().split(/\s+/).filter(Boolean)
    const title = words.slice(0, 2).join(' ')
    const saved = saveNote({
      content: transcript,
      source_model: model?.name ?? modelId,
      title,
    })
    if (saved) {
      toast.success('Note saved locally')
      setRefreshNotes((prev) => prev + 1)
    } else {
      toast.error('Could not save note')
    }
  }, [transcript, modelId])

  return (
    <div className="min-h-svh bg-background">
      <Toaster />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Mic className="size-5 text-foreground" />
            <h1 className="text-lg font-semibold tracking-tight">VoiceScribe</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status={status} isOnline={isOnline} loadProgress={loadProgress} />
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Local Notes
            </Badge>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Speech to Text</CardTitle>
                    <CardDescription>
                      Click the microphone to start dictating. Local Whisper models can work offline after their first successful download.
                    </CardDescription>
                  </div>
                  <RecordingButton
                    status={status}
                    onStart={handleStart}
                    onStop={handleStop}
                  />
                </div>
                {status === 'loading' && (
                  <div className="space-y-1 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Downloading model...</span>
                      <span>{Math.round(loadProgress)}%</span>
                    </div>
                    <Progress value={loadProgress} />
                  </div>
                )}
                {status === 'processing' && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Transcribing audio, please wait...
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <Textarea
                  data-voicescribe-internal=""
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your transcription will appear here..."
                  className="min-h-50 resize-y text-base leading-relaxed"
                />
                {interimText && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {interimText}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(transcript)
                      toast.success('Copied to clipboard')
                    }}
                    disabled={!transcript}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={!transcript}
                  >
                    Save Note
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTranscript}
                    disabled={!transcript}
                  >
                    Clear
                  </Button>
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <Button
                    variant={showFloatingNote ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowFloatingNote(!showFloatingNote)}
                  >
                    <Keyboard data-icon="inline-start" className="size-3" />
                    Floating Note
                  </Button>
                  {transcript && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {transcript.split(/\s+/).filter(Boolean).length} words
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">How to use</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-medium">Choose a model</p>
                        <p className="text-xs text-muted-foreground">
                          Select from the panel on the right
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-medium">Click the mic</p>
                        <p className="text-xs text-muted-foreground">
                          Start recording your speech
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-medium">Edit and save</p>
                        <p className="text-xs text-muted-foreground">
                          Copy or save your transcription
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Tabs defaultValue="settings">
              <TabsList className="w-full">
                <TabsTrigger value="settings" className="flex-1">
                  <Settings className="mr-1.5 size-3" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">
                  <FileText className="mr-1.5 size-3" />
                  Notes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Model</CardTitle>
                    <CardDescription className="text-xs">
                      Choose a speech recognition model
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModelSelector
                      modelId={modelId}
                      onModelChange={changeModel}
                      disabled={status === 'listening'}
                    />
                  </CardContent>
                </Card>
                <ModelInfoPanel modelId={modelId} />
              </TabsContent>
              <TabsContent value="notes">
                <SavedNotesList refreshTrigger={refreshNotes} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <FloatingNote
        content={transcript}
        interimText={interimText}
        onContentChange={setTranscript}
        onSave={handleSaveNote}
        onClear={clearTranscript}
        onClose={() => setShowFloatingNote(false)}
        visible={showFloatingNote}
      />

    </div>
  )
}

export default App
