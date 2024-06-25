// dbUsers.ts
import { User } from '../classes/user';
import { query } from './db';
import {Category} from "../classes/category";

export class dbUsers {

    static async createUser(phoneNumber: string, name: string): Promise<User | null> {
        try {
            const response = await query(
                'INSERT INTO users (phone_number, name) VALUES ($1, $2) RETURNING *',
                [phoneNumber, name]
            );

            const row = response.rows[0];
            return new User(row.phone_number, row.user_id);
        } catch (error) {
            console.error('Error creating user:', error);
            return null;
        }
    }

    static async getUserByPhone(phone: string): Promise<User | null> {
        const response = await query('SELECT * FROM users WHERE phone_number = $1', [phone]);
        const row = response.rows[0];

        if (row) {
            return new User(row.phone_number, row.user_id);
        } else {
            return null;
        }
    }

    static async getUserById(id: string): Promise<User | null> {
        const response = await query('SELECT * FROM users WHERE user_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new User(row.phone_number, row.user_id);
        } else {
            return null;
        }
    }

    static async deleteUser(id: string): Promise<void> {
        await query('DELETE FROM users WHERE user_id = $1', [id]);
    }

    static async getAllNotesForUser(userId: string): Promise<Category[]> {
        const response = await query('SELECT * FROM notes WHERE user_id = $1', [userId]);

        return response.rows.map((row: any) => new Category(row.category_name, row.user_id, row.category_id));
    }
}
