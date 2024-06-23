// dbUsers.ts
import { User } from '../classes/user';
import { query } from './db';

export class dbUsers {
    static async getUserByPhone(phone: string): Promise<User | null> {
        const response = await query('SELECT * FROM users WHERE phone_number = $1', [phone]);
        const row = response.rows[0];

        if (row) {
            return new User(row.phone_number, row.name, row.user_id);
        } else {
            return null;
        }
    }

    static async getUserById(id: string): Promise<User | null> {
        const response = await query('SELECT * FROM users WHERE user_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new User(row.phone_number, row.name, row.user_id);
        } else {
            return null;
        }
    }

    static async deleteUser(id: string): Promise<void> {
        await query('DELETE FROM users WHERE user_id = $1', [id]);
    }
}
