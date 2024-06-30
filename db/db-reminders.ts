import { Reminder } from '../classes/reminder';
import { query, dateFromDb } from './db';

export class dbReminders {
    static reminderObjFromDb(row: { [field: string]: any }): Reminder {
        if (typeof row.reminder_id !== "string" ||
            typeof row.user_id !== "string" ||
            typeof row.reminder_text !== "string" ||
            !(row.due_date instanceof Date) ||
            typeof row.is_completed !== "boolean") {
            throw new Error("Trying to create reminder obj from a db row with missing data");
        }
        return new Reminder(
            row.reminder_id,
            row.user_id,
            row.reminder_text,
            row.due_date,
            row.is_completed,
            row.created_at
        );
    }

    static async createReminder(userId: string, reminderText: string, dueDate: Date): Promise<Reminder | null> {
        try {
            const response = await query(
                'INSERT INTO reminders (user_id, reminder_text, due_date) VALUES ($1, $2, $3) RETURNING *',
                [userId, reminderText, dueDate]
            );

            const row = response.rows[0];
            return this.reminderObjFromDb(row);
        } catch (error) {
            console.error('Error creating reminder:', error);
            return null;
        }
    }

    static async getReminder(id: string): Promise<Reminder | null> {
        const response = await query('SELECT * FROM reminders WHERE reminder_id = $1', [id]);
        const row = response.rows[0];

        if (row) {
            return this.reminderObjFromDb(row);
        } else {
            return null;
        }
    }

    static async updateReminder(reminder: Reminder): Promise<void> {
        await query('UPDATE reminders SET reminder_text = $1, due_date = $2, is_completed = $3 WHERE reminder_id = $4',
            [reminder.reminderText, reminder.dueDate, reminder.isCompleted, reminder.dbId]);
    }

    static async deleteReminder(id: string): Promise<void> {
        await query('DELETE FROM reminders WHERE reminder_id = $1', [id]);
    }

    static async getAllRemindersForUser(userId: string): Promise<Reminder[]> {
        const response = await query('SELECT * FROM reminders WHERE user_id = $1 ORDER BY due_date ASC', [userId]);
        return response.rows.map((row: any) => this.reminderObjFromDb(row));
    }

    static async getAllPendingReminders(): Promise<Reminder[]> {
        const response = await query('SELECT * FROM reminders WHERE is_completed = false AND due_date > NOW() ORDER BY due_date ASC');
        return response.rows.map((row: any) => this.reminderObjFromDb(row));
    }
}