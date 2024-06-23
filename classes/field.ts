export class Field {
    field_id: string;
    category_id: string;
    field_name: string;

    constructor(field_id: string, category_id: string, field_name: string) {
        this.field_id = field_id;
        this.category_id = category_id;
        this.field_name = field_name;
    }
}