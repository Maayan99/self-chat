// dbContacts.ts
import { Contact } from '../classes/contact';
import { query } from './db';

export class dbContacts {

    static async createContact(userId: string, contactName: string, phoneNumber: string, email: string, createdAt: Date): Promise<Contact | null> {
        try {
            const response = await query(
                'INSERT INTO contacts (user_id, contact_name, phone_number, email, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [userId, contactName, phoneNumber, email, createdAt]
            );

            const row = response.rows[0];
            return new Contact(row.contact_id, row.user_id, row.contact_name, row.phone_number, row.email, row.created_at);
        } catch (error) {
            console.error('Error creating contact:', error);
            return null;
        }
    }

    static async getDbContact(id: string): Promise<Contact | null> {
        const response = await query('SELECT * FROM contacts WHERE contact_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new Contact(row.user_id, row.contact_name, row.phone_number, row.email, row.created_at, row.contact_id);
        } else {
            return null;
        }
    }

    static async deleteDbContact(id: string): Promise<void> {
        await query('DELETE FROM contacts WHERE contact_id = $1', [id]);
    }

    static async updateDbContact(contact: Contact): Promise<void> {
        await query('UPDATE contacts SET contact_name = $1, phone_number = $2, email = $3 WHERE contact_id = $4',
            [contact.contactName, contact.phoneNumber, contact.email, contact.dbId]);
    }
}
