// dbCategoryEntries.ts
import { CategoryEntry } from '../classes/category-entry';
import { query } from './db';

export class dbCategoryEntries {
    static async getDbCategoryEntry(id: string): Promise<CategoryEntry | null> {
        const response = await query('SELECT * FROM category_entries WHERE entry_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new CategoryEntry(row.category_id, row.created_at, row.entry_id);
        } else {
            return null;
        }
    }

    static async deleteDbCategoryEntry(id: string): Promise<void> {
        await query('DELETE FROM category_entries WHERE entry_id = $1', [id]);
    }

    static async updateDbCategoryEntry(entry: CategoryEntry): Promise<void> {
        await query('UPDATE category_entries SET category_id = $1 WHERE entry_id = $2',
            [entry.categoryId, entry.dbId]);
    }
}
