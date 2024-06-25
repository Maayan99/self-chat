// dbUsers.ts
import { User } from '../classes/user';
import {dateFromDb, query} from './db';
import {Note} from "../classes/note";
import {dbNotes} from "./db-notes";
import {dbLinks} from "./db-links";
import {Link} from "../classes/link";
import {dbContacts} from "./db-contacts";
import {Contact} from "../classes/contact";

export class dbUsers {
    static userObjFromDb(row: { [field: string]: any }): User {
        if (typeof (row.user_id) !== "string"
            || typeof (row.phone_number) !== "string"
            || typeof (row.plan) !== "string") {
            throw new Error("Trying to create user obj from a db row with missing data");
        }
        return new User(row.phone_number, row.user_id, row.plan);
    }


    static async createUser(phoneNumber: string, name: string): Promise<User | null> {
        try {
            const response = await query(
                'INSERT INTO users (phone_number, name) VALUES ($1, $2) RETURNING *',
                [phoneNumber, name]
            );

            const row = response.rows[0];
            return this.userObjFromDb(row);
        } catch (error) {
            console.error('Error creating user:', error);
            return null;
        }
    }

    static async getUserByPhone(phone: string): Promise<User | null> {
        const response = await query('SELECT * FROM users WHERE phone_number = $1', [phone]);
        const row = response.rows[0];

        if (row) {
            return this.userObjFromDb(row);
        } else {
            return null;
        }
    }

    static async getUserById(id: string): Promise<User | null> {
        const response = await query('SELECT * FROM users WHERE user_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return this.userObjFromDb(row);
        } else {
            return null;
        }
    }

    static async deleteUser(id: string): Promise<void> {
        await query('DELETE FROM users WHERE user_id = $1', [id]);
    }

    static async getAllNotesForUser(userId: string): Promise<Note[]> {
        const response = await query('SELECT * FROM notes WHERE user_id = $1', [userId]);

        return response.rows.map((row: any) => dbNotes.noteObjFromDb(row));
    }

    static async getAllLinksForUser(userId: string): Promise<Link[]> {
        const response = await query('SELECT * FROM links WHERE user_id = $1', [userId]);

        return response.rows.map((row: any) => dbLinks.linkObjFromDb(row));
    }

    static async getAllContactsForUser(userId: string): Promise<Contact[]> {
        const response = await query('SELECT * FROM contacts WHERE user_id = $1', [userId]);

        return response.rows.map((row: any) => dbContacts.contactObjFromDb(row));
    }
}
