// dbLinks.ts
import { Link } from '../classes/link';
import { query } from './db';

export class dbLinks {
    static async createLink(url: string, userId: string, extraText: string, createdAt: Date): Promise<Link | null> {
        try {
            const response = await query(
                'INSERT INTO links (url, user_id, extra_text, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
                [url, userId, extraText, createdAt]
            );

            const row = response.rows[0];
            return new Link(row.link_id, row.url, row.user_id, row.extra_text, row.created_at);
        } catch (error) {
            console.error('Error creating link:', error);
            return null;
        }
    }

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
