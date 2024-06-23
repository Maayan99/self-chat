export class Note {
    note_id: string;
    user_id: string;
    note_text: string;
    created_at: Date;

    constructor(note_id: string, user_id: string, note_text: string, created_at?: Date) {
        this.note_id = note_id;
        this.user_id = user_id;
        this.note_text = note_text;
        this.created_at = created_at || new Date();
    }
}