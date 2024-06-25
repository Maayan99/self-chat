// contact.ts
import { User } from './user';

export class Contact {
    dbId: string;
    userId: string;
    contactName?: string;
    phoneNumber?: string;
    email?: string;
    createdAt: Date;
    tags: string[];

    constructor(dbId: string, userId: string, contactName?: string, phoneNumber?: string, email?: string, createdAt?: Date, tags?: string[]) {
        this.dbId = dbId;
        this.userId = userId;
        this.contactName = contactName;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.createdAt = createdAt || new Date();
        if (tags) {
            this.tags = tags;
        } else {
            this.tags = [];
        }
    }

    getDbId(): string {
            return this.dbId;
    }
}
