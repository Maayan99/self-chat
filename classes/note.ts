// note.ts
import {User} from './user';

export class Note {
    dbId: string;
    userId: string;
    noteText: string;
    createdAt: Date;
    user?: User;

    constructor(dbId: string, noteText: string, userId: string, createdAt?: Date, user?: User) {
        this.dbId = dbId;
        this.userId = userId;
        this.noteText = noteText;
        this.createdAt = createdAt || new Date();
        this.user = user;
    }

    getDbId(): string {
        return this.dbId;
    }
}
