// dbContacts.ts
import { Contact } from '../classes/contact';
import {dateFromDb, query} from './db';
import {Link} from "../classes/link";

export class dbContacts {
    static contactObjFromDb(row: { [field: string]: any }): Contact {
        if (typeof (row.contact_id) !== "string"
            || typeof (row.user_id) !== "string"
            || typeof (row.phone_number) !== "string") {
            throw new Error("Trying to create contact obj from a db row with missing data");
        }
        return new Contact(row.contact_id, row.user_id, row.phone_number, dateFromDb(row.created_at), row.tags);
    }

    static async createContact(userId: string, contactName: string, phoneNumber: string, email: string, createdAt: Date): Promise<Contact | null> {
        try {
            const response = await query(
                'INSERT INTO contacts (user_id, contact_name, phone_number, email, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [userId, contactName, phoneNumber, email, createdAt]
            );

            const row = response.rows[0];
            return this.contactObjFromDb(row);
        } catch (error) {
            console.error('Error creating contact:', error);
            return null;
        }
    }

    static async getDbContact(id: string): Promise<Contact | null> {
        const response = await query('SELECT * FROM contacts WHERE contact_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return this.contactObjFromDb(row);
        } else {
            return null;
        }
    }

    static async deleteDbContact(id: string): Promise<void> {
        await query('DELETE FROM contacts WHERE contact_id = $1', [id]);
    }

    static async updateDbContact(contact: Contact): Promise<void> {
        await query('UPDATE contacts SET phone_number = $1 WHERE contact_id = $2',
            [contact.phoneNumber, contact.getDbId()]);
    }
}
