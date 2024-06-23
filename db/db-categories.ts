// dbCategories.ts
import { Category } from '../classes/category';
import { User } from '../classes/user';
import { query } from './db';

export class dbCategories {
    static async getDbCategory(id: string): Promise<Category | null> {
        const response = await query('SELECT * FROM categories WHERE category_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new Category(row.category_name, row.user_id, row.category_id);
        } else {
            return null;
        }
    }

    static async deleteDbCategory(id: string): Promise<void> {
        await query('DELETE FROM categories WHERE category_id = $1', [id]);
    }

    static async updateDbCategory(category: Category): Promise<void> {
        await query('UPDATE categories SET category_name = $1 WHERE category_id = $2',
            [category.categoryName, category.dbId]);
    }

    static async getAllDbCategories(user: User): Promise<Category[]> {
        const userId = await user.getDbId();
        const response = await query('SELECT * FROM categories WHERE user_id = $1', [userId]);

        return response.rows.map((row: any) => new Category(row.category_name, row.user_id, row.category_id));
    }
}
