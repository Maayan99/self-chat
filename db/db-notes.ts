// dbNotes.ts
import { Note } from '../classes/note';
import { query } from './db';

export class dbNotes {
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
