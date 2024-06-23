// dbEntryFields.ts
import { EntryField } from '../classes/entry-field';
import { query } from './db';

export class dbEntryFields {
    static async getDbEntryField(id: string): Promise<EntryField | null> {
        const response = await query('SELECT * FROM entry_fields WHERE entry_field_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new EntryField(row.entry_id, row.field_id, row.field_value, row.entry_field_id);
        } else {
            return null;
        }
    }

    static async deleteDbEntryField(id: string): Promise<void> {
        await query('DELETE FROM entry_fields WHERE entry_field_id = $1', [id]);
    }

    static async updateDbEntryField(entryField: EntryField): Promise<void> {
        await query('UPDATE entry_fields SET field_value = $1 WHERE entry_field_id = $2',
            [entryField.fieldValue, entryField.dbId]);
    }
}
