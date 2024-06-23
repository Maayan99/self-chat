// dbContacts.ts
import { Contact } from '../classes/contact';
import { query } from './db';

export class dbContacts {
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
