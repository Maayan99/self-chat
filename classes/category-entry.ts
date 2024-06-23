export class CategoryEntry {
    entry_id: string;
    category_id: string;
    created_at: Date;

    constructor(entry_id: string, category_id: string, created_at?: Date) {
        this.entry_id = entry_id;
        this.category_id = category_id;
        this.created_at = created_at || new Date();
    }
}