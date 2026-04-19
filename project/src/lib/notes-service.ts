import { supabase } from './supabase'

export interface Note {
  id: string
  title: string
  content: string
  source_model: string
  duration_seconds: number
  created_at: string
  updated_at: string
}

export async function saveNote(note: {
  content: string
  source_model: string
  title?: string
}): Promise<Note | null> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: session.session.user.id,
      content: note.content,
      source_model: note.source_model,
      title: note.title ?? '',
    })
    .select()
    .maybeSingle()

  if (error) return null
  return data
}

export async function getNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function deleteNote(id: string): Promise<boolean> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  return !error
}
