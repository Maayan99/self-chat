// dbFields.ts
import { Field } from '../classes/field';
import { query } from './db';

export class dbFields {
    static async createField(fieldName: string, categoryId: string): Promise<Field | null> {
        try {
            const response = await query(
                'INSERT INTO fields (field_name, category_id) VALUES ($1, $2) RETURNING *',
                [fieldName, categoryId]
            );

            const row = response.rows[0];
            return new Field(row.field_name, row.category_id, row.field_id);
        } catch (error) {
            console.error('Error creating field:', error);
            return null;
        }
    }

    static async getDbField(id: string): Promise<Field | null> {
        const response = await query('SELECT * FROM fields WHERE field_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new Field(row.field_name, row.category_id, row.field_id);
        } else {
            return null;
        }
    }

    static async deleteDbField(id: string): Promise<void> {
        await query('DELETE FROM fields WHERE field_id = $1', [id]);
    }

    static async updateDbField(field: Field): Promise<void> {
        await query('UPDATE fields SET field_name = $1 WHERE field_id = $2',
            [field.fieldName, field.dbId]);
    }
}
