// note.ts
import {User} from './user';

export class Note {
    dbId: string;
    userId: string;
    tags: string[];
    noteText: string;
    createdAt: Date;

    constructor(dbId: string, noteText: string, userId: string, createdAt?: Date, tags?: string[]) {
        this.dbId = dbId;
        this.userId = userId;
        this.noteText = noteText;
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
