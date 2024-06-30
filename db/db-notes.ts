// dbNotes.ts
import {Note} from '../classes/note';
import {dateFromDb, query} from './db';



export class dbNotes {
    static noteObjFromDb(row: { [field: string]: any }): Note {
        if (typeof (row.note_id) !== "string"
            || typeof (row.note_text) !== "string"
            || typeof (row.user_id) !== "string") {
            throw new Error("Trying to create note obj from a db row with missing data");
        }
        return new Note(row.note_id, row.note_text, row.user_id, row.created_at, row.tags);
    }

    static async createNote(noteText: string, userId: string): Promise<Note | null> {
        try {
            const response = await query(
                'INSERT INTO notes (note_text, user_id) VALUES ($1, $2) RETURNING *',
                [noteText, userId]
            );

            const row = response.rows[0];
            return this.noteObjFromDb(row);
        } catch (error) {
            console.error('Error creating note:', error);
            return null;
        }
    }

    static async getDbNote(id: string): Promise<Note | null> {
        const response = await query('SELECT * FROM notes WHERE note_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return this.noteObjFromDb(row);
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

    static async deleteMonthOldNotes(): Promise<void> {
        await query('DELETE FROM notes WHERE created_at < (NOW() - INTERVAL 30 DAY)')
    }
}
