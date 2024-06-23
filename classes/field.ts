// field.ts
import { Category } from './category';

export class Field {
    dbId: string;
    categoryId: string;
    fieldName: string;
    category?: Category;

    constructor(fieldName: string, categoryId: string, dbId: string, category?: Category) {
        this.dbId = dbId;
        this.categoryId = categoryId;
        this.fieldName = fieldName;
        this.category = category;
    }

    getDbId(): string {
        return this.dbId;
    }
}
