// dbNotes.ts
import {Note} from '../classes/note';
import {dateFromDb, query} from './db';


export function noteObjFromDb(row: { [field: string]: any }): Note {
    if (typeof (row.note_id) !== "string"
        || typeof (row.note_text) !== "string"
        || typeof (row.user_id) !== "string") {
        throw new Error("Trying to create note obj from a db row with missing data");
    }
    return new Note(row.note_id, row.note_text, row.user_id, dateFromDb(row.created_at), row.tags);
}

export class dbNotes {
    static async createNote(noteText: string, userId: string): Promise<Note | null> {
        try {
            const response = await query(
                'INSERT INTO notes (note_text, user_id) VALUES ($1, $2, $3) RETURNING *',
                [noteText, userId]
            );

            const row = response.rows[0];
            return noteObjFromDb(row);
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    }

    static async getDbNote(id: string): Promise<Note | null> {
        const response = await query('SELECT * FROM notes WHERE note_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return noteObjFromDb(row);
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
