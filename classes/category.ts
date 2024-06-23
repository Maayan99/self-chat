export class Category {
    category_id: string;
    user_id: string;
    category_name: string;

    constructor(category_id: string, user_id: string, category_name: string) {
        this.category_id = category_id;
        this.user_id = user_id;
        this.category_name = category_name;
    }
}