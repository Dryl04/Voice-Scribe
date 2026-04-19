import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Copy, FileText } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { getNotes, deleteNote, type Note } from '@/lib/notes-service'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'

interface SavedNotesListProps {
  refreshTrigger: number
}

export function SavedNotesList({ refreshTrigger }: SavedNotesListProps) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (!user) {
        setNotes([])
        setLoading(false)
        return
      }
      const data = await getNotes()
      setNotes(data)
      setLoading(false)
    }
    load()
  }, [refreshTrigger, user])

  const handleDelete = async (id: string) => {
    const success = await deleteNote(id)
    if (success) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      toast.success('Note deleted')
    }
  }

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-muted-foreground">Loading notes...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>Sign in required</EmptyTitle>
          <EmptyDescription>
            Sign in to save and view your notes across devices.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (notes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No saved notes</EmptyTitle>
          <EmptyDescription>
            Record speech and save your transcriptions here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm truncate">
                    {note.title || 'Untitled Note'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(note.created_at).toLocaleString()}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {note.source_model}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
              <div className="mt-2 flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => handleCopy(note.content)}>
                  <Copy className="size-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(note.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
