export class Contact {
    contact_id: string;
    user_id: string;
    contact_name?: string;
    phone_number?: string;
    email?: string;
    created_at: Date;

    constructor(contact_id: string, user_id: string, contact_name?: string, phone_number?: string, email?: string, created_at?: Date) {
        this.contact_id = contact_id;
        this.user_id = user_id;
        this.contact_name = contact_name;
        this.phone_number = phone_number;
        this.email = email;
        this.created_at = created_at || new Date();
    }
}