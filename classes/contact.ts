// contact.ts
import { User } from './user';

export class Contact {
    dbId: string;
    userId: string;
    contactName?: string;
    phoneNumber?: string;
    email?: string;
    createdAt: Date;
    user?: User;

    constructor(dbId: string, userId: string, contactName?: string, phoneNumber?: string, email?: string, createdAt?: Date, user?: User) {
        this.dbId = dbId;
        this.userId = userId;
        this.contactName = contactName;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.createdAt = createdAt || new Date();
        this.user = user;
    }

    getDbId(): string {
            return this.dbId;
    }
}
