export interface Note {
  id: string;
  title: string;
  content: string;
  source_model: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

const NOTES_STORAGE_KEY = "voicescribe.notes.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  const candidates = [window.localStorage, window.sessionStorage];
  for (const candidate of candidates) {
    try {
      const probeKey = `${NOTES_STORAGE_KEY}.probe`;
      candidate.setItem(probeKey, "1");
      candidate.removeItem(probeKey);
      return candidate;
    } catch {
      // Try the next storage backend if this one is unavailable.
    }
  }

  return null;
}

function parseNotes(rawNotes: string | null): Note[] {
  if (!rawNotes) return [];

  try {
    const parsed = JSON.parse(rawNotes);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((note): note is Note => {
      return (
        typeof note === "object" &&
        note !== null &&
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.content === "string" &&
        typeof note.source_model === "string" &&
        typeof note.duration_seconds === "number" &&
        typeof note.created_at === "string" &&
        typeof note.updated_at === "string"
      );
    });
  } catch {
    return [];
  }
}

function persistNotes(notes: Note[]) {
  const storage = getStorage();
  if (!storage) return false;

  storage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  return true;
}

function createNoteId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function saveNote(note: {
  content: string;
  source_model: string;
  title?: string;
}): Note | null {
  const content = note.content.trim();
  if (!content) return null;

  const now = new Date().toISOString();
  const notes = getNotes();
  const savedNote: Note = {
    id: createNoteId(),
    title: note.title?.trim() ?? "",
    content,
    source_model: note.source_model,
    duration_seconds: 0,
    created_at: now,
    updated_at: now,
  };

  if (!persistNotes([savedNote, ...notes])) {
    return null;
  }

  return savedNote;
}

export function getNotes(): Note[] {
  const storage = getStorage();
  if (!storage) return [];

  return parseNotes(storage.getItem(NOTES_STORAGE_KEY))
    .slice()
    .sort((left: Note, right: Note) => {
      return Date.parse(right.created_at) - Date.parse(left.created_at);
    });
}

export function deleteNote(id: string): boolean {
  const notes = getNotes();
  const nextNotes = notes.filter((note) => note.id !== id);
  if (nextNotes.length === notes.length) return false;

  return persistNotes(nextNotes);
}
