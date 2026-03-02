/**
 * Notes storage module
 *
 * Users can add personal notes about clocks
 */

import { query } from './db';

export type Note = {
  id: string;
  userId: string;
  clockId: string;
  content: string;
  tags: Tag[];
  createdAt: number;
  updatedAt: number;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

type NoteRow = {
  id: string;
  user_id: string;
  clock_id: string;
  content: string;
  created_at: number;
  updated_at: number;
};

type TagRow = {
  id: string;
  name: string;
  color: string;
  created_at: number;
};

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at
  };
}

/**
 * Get all tags for a note
 */
async function getTagsForNote(noteId: string): Promise<Tag[]> {
  const result = await query<TagRow>(
    `SELECT t.* FROM tags t
     INNER JOIN note_tags nt ON t.id = nt.tag_id
     WHERE nt.note_id = $1
     ORDER BY t.name`,
    [noteId]
  );
  
  return result.rows.map(rowToTag);
}

/**
 * Convert note row to Note with tags
 */
async function rowToNote(row: NoteRow): Promise<Note> {
  const tags = await getTagsForNote(row.id);
  return {
    id: row.id,
    userId: row.user_id,
    clockId: row.clock_id,
    content: row.content,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get note for a specific clock by user
 */
export async function getNoteByUserAndClock(userId: string, clockId: string): Promise<Note | null> {
  const result = await query<NoteRow>(
    'SELECT * FROM notes WHERE user_id = $1 AND clock_id = $2',
    [userId, clockId]
  );
  
  if (result.rows.length === 0) return null;
  return rowToNote(result.rows[0]);
}

/**
 * Get all notes for a user
 */
export async function getNotesByUser(userId: string): Promise<Note[]> {
  const result = await query<NoteRow>(
    'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  
  const notes: Note[] = [];
  for (const row of result.rows) {
    notes.push(await rowToNote(row));
  }
  return notes;
}

/**
 * Create or update a note for a clock
 */
export async function upsertNote(
  userId: string, 
  clockId: string, 
  content: string,
  tagIds?: string[]
): Promise<Note> {
  const id = globalThis.crypto?.randomUUID?.() || `note_${Date.now()}`;
  const now = Date.now();

  // Upsert the note
  await query(
    `INSERT INTO notes (id, user_id, clock_id, content, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, clock_id) 
     DO UPDATE SET content = $4, updated_at = $6`,
    [id, userId, clockId, content, now, now]
  );

  // Get the actual note (might be existing)
  const noteResult = await query<NoteRow>(
    'SELECT * FROM notes WHERE user_id = $1 AND clock_id = $2',
    [userId, clockId]
  );
  
  const note = noteResult.rows[0];

  // Update tags if provided
  if (tagIds !== undefined) {
    // Remove existing tags
    await query('DELETE FROM note_tags WHERE note_id = $1', [note.id]);
    
    // Add new tags
    for (const tagId of tagIds) {
      await query(
        'INSERT INTO note_tags (note_id, tag_id, created_at) VALUES ($1, $2, $3)',
        [note.id, tagId, now]
      );
    }
  }

  return rowToNote(note);
}

/**
 * Delete a note
 */
export async function deleteNote(userId: string, clockId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM notes WHERE user_id = $1 AND clock_id = $2',
    [userId, clockId]
  );
  
  return (result.rowCount ?? 0) > 0;
}

// ==================== TAGS ====================

/**
 * Get all tags
 */
export async function getAllTags(): Promise<Tag[]> {
  const result = await query<TagRow>(
    'SELECT * FROM tags ORDER BY name'
  );
  
  return result.rows.map(rowToTag);
}

/**
 * Get tag by ID
 */
export async function getTagById(id: string): Promise<Tag | null> {
  const result = await query<TagRow>(
    'SELECT * FROM tags WHERE id = $1',
    [id]
  );
  
  if (result.rows.length === 0) return null;
  return rowToTag(result.rows[0]);
}

/**
 * Create a new tag
 */
export async function createTag(name: string, color?: string): Promise<Tag> {
  const id = globalThis.crypto?.randomUUID?.() || `tag_${Date.now()}`;
  const now = Date.now();
  const tagColor = color || '#3B82F6';

  await query(
    `INSERT INTO tags (id, name, color, created_at)
     VALUES ($1, $2, $3, $4)`,
    [id, name, tagColor, now]
  );

  return {
    id,
    name,
    color: tagColor,
    createdAt: now
  };
}

/**
 * Update a tag
 */
export async function updateTag(id: string, updates: { name?: string; color?: string }): Promise<Tag | null> {
  const existing = await getTagById(id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    setClauses.push(`color = $${paramIndex++}`);
    values.push(updates.color);
  }

  if (setClauses.length === 0) return existing;

  values.push(id);
  await query(
    `UPDATE tags SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return getTagById(id);
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<boolean> {
  const result = await query('DELETE FROM tags WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
