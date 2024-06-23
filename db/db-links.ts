// dbLinks.ts
import { Link } from '../classes/link';
import { query } from './db';

export class dbLinks {
    static async getDbLink(id: string): Promise<Link | null> {
        const response = await query('SELECT * FROM links WHERE link_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return new Link(row.url, row.user_id, row.extra_text, row.created_at, row.link_id);
        } else {
            return null;
        }
    }

    static async deleteDbLink(id: string): Promise<void> {
        await query('DELETE FROM links WHERE link_id = $1', [id]);
    }

    static async updateDbLink(link: Link): Promise<void> {
        await query('UPDATE links SET url = $1, extra_text = $2 WHERE link_id = $3',
            [link.url, link.extraText, link.dbId]);
    }
}
