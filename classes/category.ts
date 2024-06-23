// category.ts
import { User } from './user';

export class Category {
    dbId: string;
    userId: string;
    categoryName: string;
    user?: User;

    constructor(categoryName: string, userId: string, dbId: string, user?: User) {
        this.dbId = dbId;
        this.userId = userId;
        this.categoryName = categoryName;
        this.user = user;
    }

    getDbId(): string {
        return this.dbId;
    }
}
