// dbNotes.ts
import { Note } from '../classes/note';
import { query } from './db';

export class dbNotes {
    static async createNote(noteText: string, userId: string, createdAt: Date): Promise<Note | null> {
        try {
            const response = await query(
                'INSERT INTO notes (note_text, user_id, created_at) VALUES ($1, $2, $3) RETURNING *',
                [noteText, userId, createdAt]
            );

            const row = response.rows[0];
            return new Note(row.note_id, row.note_text, row.user_id, row.created_at);
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    }

    static async getDbNote(id: string): Promise<Note | null> {
        const response = await query('SELECT * FROM notes WHERE note_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new Note(row.note_text, row.user_id, row.created_at, row.note_id);
        } else {
            return null;
        }
    }

    static async deleteDbNote(id: string): Promise<void> {
        await query('DELETE FROM notes WHERE note_id = $1', [id]);
    }

    static async updateDbNote(note: Note): Promise<void> {
        await query('UPDATE notes SET note_text = $1 WHERE note_id = $2',
            [note.noteText, note.dbId]);
    }
}
