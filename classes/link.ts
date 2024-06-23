// link.ts
import { User } from './user';

export class Link {
    dbId: string;
    userId: string;
    url: string;
    extraText?: string;
    createdAt: Date;
    user?: User;

    constructor(dbId: string, url: string, userId: string, extraText?: string, createdAt?: Date, user?: User) {
        this.dbId = dbId;
        this.userId = userId;
        this.url = url;
        this.extraText = extraText;
        this.createdAt = createdAt || new Date();
        this.user = user;
    }

    getDbId(): string {
            return this.dbId;
    }
}
