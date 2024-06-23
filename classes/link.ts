export class Link {
    link_id: string;
    user_id: string;
    url: string;
    extra_text?: string;
    created_at: Date;

    constructor(link_id: string, user_id: string, url: string, extra_text?: string, created_at?: Date) {
        this.link_id = link_id;
        this.user_id = user_id;
        this.url = url;
        this.extra_text = extra_text;
        this.created_at = created_at || new Date();
    }
}