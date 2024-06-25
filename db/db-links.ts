// dbLinks.ts
import { Link } from '../classes/link';
import {dateFromDb, query} from './db';

export class dbLinks {
    static linkObjFromDb(row: { [field: string]: any }): Link {
        if (typeof (row.link_id) !== "string"
            || typeof (row.user_id) !== "string"
            || typeof (row.url) !== "string") {
            throw new Error("Trying to create link obj from a db row with missing data");
        }
        return new Link(row.link_id, row.url, row.user_id, row.extra_text, dateFromDb(row.created_at), row.tags);
    }

    static async createLink(url: string, userId: string, extraText: string, createdAt: Date): Promise<Link | null> {
        try {
            const response = await query(
                'INSERT INTO links (url, user_id, extra_text, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
                [url, userId, extraText, createdAt]
            );

            const row = response.rows[0];
            return this.linkObjFromDb(row);
        } catch (error) {
            console.error('Error creating link:', error);
            return null;
        }
    }

    static async getDbLink(id: string): Promise<Link | null> {
        const response = await query('SELECT * FROM links WHERE link_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return this.linkObjFromDb(row);
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
