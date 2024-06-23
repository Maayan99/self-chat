// categoryEntry.ts
import {Category} from './category';

export class CategoryEntry {
    dbId: string;
    categoryId: string;
    createdAt: Date;
    category?: Category;

    constructor(dbId: string, categoryId: string, createdAt?: Date, category?: Category) {
        this.dbId = dbId;
        this.categoryId = categoryId;
        this.createdAt = createdAt || new Date();
        this.category = category;
    }

    getDbId(): string {
        return this.dbId;
    }
}
