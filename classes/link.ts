// link.ts
import { User } from './user';

export class Link {
    dbId: string;
    userId: string;
    url: string;
    tags: string[];
    extraText?: string;
    createdAt: Date;

    constructor(dbId: string, url: string, userId: string, extraText?: string, createdAt?: Date, tags?: string[]) {
        this.dbId = dbId;
        this.userId = userId;
        this.url = url;
        this.extraText = extraText;
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
