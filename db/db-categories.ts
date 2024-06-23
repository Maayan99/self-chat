// dbCategories.ts
import { Category } from '../classes/category';
import { User } from '../classes/user';
import { query } from './db';
import {Field} from "../classes/field";

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


    static async getFieldsOfCategory(categoryId: string): Promise<Field[]> {
        const response = await query('SELECT * FROM fields WHERE category_id = $1', [categoryId]);

        return response.rows.map((row: any) => new Field(row.field_name, row.category_id, row.field_id));
    }
}
