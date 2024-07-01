import { dbReminders } from '../db/db-reminders';
import { client } from '../main';
import {Reminder} from "../classes/reminder";
import {dbUsers} from "../db/db-users";

export class RemindersManager {
    private reminders: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        this.initializeReminders();
    }

    private async initializeReminders() {
        const reminders = await dbReminders.getAllPendingReminders();
        for (const reminder of reminders) {
            this.scheduleReminder(reminder);
        }
    }

    public scheduleReminder(reminder: Reminder) {
        const now = new Date();
        const timeUntilDue = reminder.dueDate.getTime() - now.getTime();

        if (timeUntilDue > 0) {
            const timeout = setTimeout(() => this.sendReminder(reminder), timeUntilDue);
            this.reminders.set(reminder.dbId, timeout);
        }
    }

    private async sendReminder(reminder: Reminder) {
        const user = await dbUsers.getUserById(reminder.userId);
        if (user) {
            await client.sendMessage(`תזכורת: ${reminder.reminderText}`, user.phone);
        }
        await dbReminders.deleteReminder(reminder.dbId);
        this.reminders.delete(reminder.dbId);
    }

    public async addReminder(reminder: Reminder) {
        this.scheduleReminder(reminder);
    }

    public cancelReminder(reminderId: string) {
        const timeout = this.reminders.get(reminderId);
        if (timeout) {
            clearTimeout(timeout);
            this.reminders.delete(reminderId);
        }
    }


    public async removeAllRemindersForUser(userId: string): Promise<void> {
        const remindersToRemove: string[] = [];

        // Identify reminders to remove
        for (const [reminderId, timeout] of this.reminders) {
            const reminder = await dbReminders.getReminder(reminderId);
            if (reminder && reminder.userId === userId) {
                remindersToRemove.push(reminderId);
            }
        }

        // Remove identified reminders
        for (const reminderId of remindersToRemove) {
            this.cancelReminder(reminderId);
        }

        console.log(`Removed ${remindersToRemove.length} reminders for user ${userId}`);
    }
}