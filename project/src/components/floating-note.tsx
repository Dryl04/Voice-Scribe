import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { GripVertical, X, Copy, Save, Minimize2, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'

interface FloatingNoteProps {
  content: string
  interimText: string
  onContentChange: (content: string) => void
  onSave: () => void
  onClear: () => void
  onClose: () => void
  visible: boolean
}

export function FloatingNote({
  content,
  interimText,
  onContentChange,
  onSave,
  onClear,
  onClose,
  visible,
}: FloatingNoteProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [minimized, setMinimized] = useState(false)
  const dragRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [position])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const card = dragRef.current
      const width = card?.offsetWidth ?? 320
      const height = card?.offsetHeight ?? 80
      const maxX = Math.max(0, window.innerWidth - width)
      const maxY = Math.max(0, window.innerHeight - height)
      const nextX = Math.min(Math.max(0, e.clientX - dragOffset.current.x), maxX)
      const nextY = Math.min(Math.max(0, e.clientY - dragOffset.current.y), maxY)
      setPosition({ x: nextX, y: nextY })
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [content, interimText])

  const displayText = interimText ? content + (content ? ' ' : '') + interimText : content

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  if (!visible) return null

  return (
    <div
      data-voicescribe-floating=""
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      ref={dragRef}
    >
      <Card className="w-80 shadow-lg border-border">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div
              className="flex cursor-grab items-center gap-1 active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Floating Note</CardTitle>
            </div>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon-xs" onClick={() => setMinimized(!minimized)}>
                {minimized ? <Maximize2 className="size-3" /> : <Minimize2 className="size-3" />}
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={onClose}>
                <X className="size-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {!minimized && (
          <CardContent className="px-3 pb-3 pt-0">
            <Textarea
              ref={textareaRef}
              value={displayText}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Start speaking to see text here..."
              className="min-h-[120px] resize-y text-sm"
            />
            <div className="mt-2 flex gap-1">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!content}>
                <Copy data-icon="inline-start" className="size-3" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={onSave} disabled={!content}>
                <Save data-icon="inline-start" className="size-3" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={onClear} disabled={!content}>
                Clear
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
