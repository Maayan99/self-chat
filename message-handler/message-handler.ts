import { IncomingMessage } from '../client/classes/incoming-message';
import { User } from '../classes/user';
import { Admin } from '../classes/admin';
import { ChatPartner } from '../classes/chat-partner';
import { dbUsers } from '../db/db-users';
import { dbNotes } from '../db/db-notes';
import { dbLinks } from '../db/db-links';
import { adminRoot } from '../trees/admin/admin-root';
import { onboardingRoot } from '../trees/onboarding/root-node';
import { ConversationHandler } from '../conversation-handler/conversation-handler';
import { client, admins } from '../main';
import { Exporter } from './exporter';
import { notifyAdminsError } from '../utils/admin-notifs-utility';
import {dbReminders} from "../db/db-reminders";
import {createTables, deleteTables} from "../db/db-initialization";

export class MessageHandler {
    private conversationHandlers: ConversationHandler[] = [];
    private exporter: Exporter;

    constructor() {
        this.exporter = new Exporter();
    }

    async handleMessage(message: IncomingMessage): Promise<void> {
        const from = message.from;
        const msgBody = typeof message.body === 'string' ? message.body.trim() : '';

        try {
            // Check for existing conversation handler
            const existingHandler = this.findConversationHandler(from);
            if (existingHandler) {
                if (msgBody == 'בטל') {
                    existingHandler.deleteConvo();
                    return;
                }
                await existingHandler.handleTriggerMessage(message);
                return;
            }

            // Handle admin messages
            if (this.isAdmin(from)) {
                if (msgBody === "אתחול דאהטבייס טייבלס") {
                    createTables();
                    return;
                }
                if (msgBody === "דרופ דרופ דרופ") {
                    deleteTables();
                    return;
                }
                if (msgBody.startsWith('לקוח ')) {
                    const customerMessage = msgBody.substring(5).trim();
                    await this.handleCustomerMessage(new IncomingMessage(customerMessage, message.id, from, message.type, message.contextId));
                } else {
                    await this.startAdminDashboard(from);
                }
                return;
            }

            // Handle help message
            if (msgBody === 'עזרה') {
                await this.sendHelpMessage(from);
                return;
            }

            // Check if user exists in DB, create if not
            let user = await this.getOrCreateUser(from);
            if (!user) {
                throw new Error(`נכשל ביצירת משתמש עבור מספר טלפון: ${from}`);
            }

            // Handle export command
            if (msgBody.startsWith('ייצא ')) {
                await this.handleExportCommand(msgBody, user);
                return;
            }

            // Handle customer message
            await this.handleCustomerMessage(message, user);
        } catch (error) {
            console.error('שגיאה בטיפול בהודעה:', error);
            await notifyAdminsError(`שגיאה בטיפול בהודעה ממספר ${from}: ${error}`);
            await client.sendMessage("אירעה שגיאה בעיבוד הבקשה שלך. צוות התמיכה שלנו יבדוק את הבעיה.", from);
        }
    }

    private async getOrCreateUser(phoneNumber: string): Promise<User | undefined> {
        try {
            let user = await dbUsers.getUserByPhone(phoneNumber);
            if (!user) {
                user = await dbUsers.createUser(phoneNumber);
                if (user) {
                    await this.startOnboarding(user);
                }
            }
            return user || undefined;
        } catch (error) {
            console.error('שגיאה ביצירת או אחזור משתמש:', error);
            await notifyAdminsError(`שגיאה ביצירת או אחזור משתמש עבור מספר ${phoneNumber}: ${error}`);
            return undefined;
        }
    }

    private async handleCustomerMessage(message: IncomingMessage, user?: User): Promise<void> {
        const phone = user ? user.phone : message.from;
        const msgBody = typeof message.body === 'string' ? message.body.trim() : '';

        try {
            if (!user) {
                user = await this.getOrCreateUser(phone);
                if (!user) {
                    throw new Error("לא ניתן ליצור או לאחזר משתמש");
                }
            }

            if (this.isReminder(msgBody)) {
                await this.handleReminder(msgBody, user);
            } else if (this.isLink(msgBody)) {
                await this.handleLink(msgBody, user);
            } else {
                await this.handleNote(msgBody, user);
            }
        } catch (error) {
            console.error('שגיאה בטיפול בהודעת לקוח:', error);
            await notifyAdminsError(`שגיאה בטיפול בהודעת לקוח ממספר ${phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בעיבוד ההודעה שלך. צוות התמיכה שלנו יבדוק את הבעיה.", phone);
        }
    }

    private async startOnboarding(user: User): Promise<void> {
        try {
            const handler = new ConversationHandler(onboardingRoot, user, client);
            this.conversationHandlers.push(handler);
            await handler.startConversation();
        } catch (error) {
            console.error('שגיאה בתהליך ה-onboarding:', error);
            await notifyAdminsError(`שגיאה בתהליך ה-onboarding עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בתהליך ההרשמה. צוות התמיכה שלנו יצור איתך קשר בקרוב.", user.phone);
        }
    }

    private async startAdminDashboard(from: string): Promise<void> {
        try {
            const admin = new Admin(from);
            const handler = new ConversationHandler(adminRoot, admin, client);
            this.conversationHandlers.push(handler);
            await handler.startConversation();
        } catch (error) {
            console.error('שגיאה בהפעלת לוח המחוונים של המנהל:', error);
            await notifyAdminsError(`שגיאה בהפעלת לוח המחוונים של המנהל עבור ${from}: ${error}`);
            await client.sendMessage("אירעה שגיאה בהפעלת לוח המחוונים. אנא נסה שוב מאוחר יותר.", from);
        }
    }

    private async sendHelpMessage(from: string): Promise<void> {
        const helpMessage = `
        ברוכים הבאים לשירות שלנו! הנה הפקודות הזמינות:
        - עזרה: הצג הודעת עזרה זו
        - ייצא [לינקים/הערות] [pdf/הודעה/אקסל/וורד]: ייצא את הנתונים שלך
        - [ההודעה שלך]: הוסף הערה או קישור חדש
        `;
        await client.sendMessage(helpMessage, from);
    }

    private async handleExportCommand(command: string, user: User): Promise<void> {
        const parts = command.split(' ');
        if (parts.length < 2) {
            await client.sendMessage("פקודת ייצוא לא חוקית. השתמש ב: ייצא [לינקים/הערות] [pdf/הודעה/אקסל/וורד]", user.phone);
            return;
        }

        const exportType = parts[1];
        const format = parts[2] || 'pdf';

        if (exportType !== 'לינקים' && exportType !== 'הערות') {
            await client.sendMessage("סוג ייצוא לא חוקי. השתמש ב'לינקים' או 'הערות'.", user.phone);
            return;
        }

        if (!['pdf', 'הודעה', 'אקסל', 'וורד'].includes(format)) {
            await client.sendMessage("פורמט ייצוא לא חוקי. השתמש ב'pdf', 'הודעה', 'אקסל', או 'וורד'.", user.phone);
            return;
        }

        try {
            const result = await this.exporter.export(user, exportType, format);
            await client.sendMessage(`ה${exportType} שלך יוצאו בפורמט ${format}. ${result}`, user.phone);
        } catch (error) {
            console.error('שגיאת ייצוא:', error);
            await notifyAdminsError(`שגיאת ייצוא עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה במהלך תהליך הייצוא. אנא נסה שוב מאוחר יותר.", user.phone);
        }
    }

    private isReminder(message: string): boolean {
        const reminderPattern = /^((\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?)|(\d{1,2}:\d{2}))(.+)/;
        return reminderPattern.test(message);
    }

    private isLink(message: string): boolean {
        const urlPattern = /https?:\/\/\S+/i;
        return urlPattern.test(message);
    }

    private async handleReminder(message: string, user: User): Promise<void> {
        try {
            const reminderPattern = /^((\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?)|(\d{1,2}:\d{2}))(.+)/;
            const match = message.match(reminderPattern);

            if (match) {
                const dateTimeStr = match[1];
                const reminderText = match[5].trim();
                const dueDate = this.parseDueDate(dateTimeStr);

                if (dueDate) {
                    const reminder = await dbReminders.createReminder(user.dbId || "", reminderText, dueDate);
                    if (reminder) {
                        await client.sendMessage("התזכורת נשמרה בהצלחה.", user.phone);
                    } else {
                        throw new Error("נכשל ביצירת תזכורת");
                    }
                } else {
                    await client.sendMessage("לא הצלחתי להבין את התאריך או השעה. אנא נסה שוב בפורמט dd/mm/yy או hh:mm.", user.phone);
                }
            } else {
                await client.sendMessage("פורמט התזכורת לא תקין. אנא השתמש בפורמט: dd/mm/yy תוכן התזכורת או hh:mm תוכן התזכורת.", user.phone);
            }
        } catch (error) {
            console.error('שגיאה בשמירת תזכורת:', error);
            await notifyAdminsError(`שגיאה בשמירת תזכורת עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בשמירת התזכורת. אנא נסה שוב.", user.phone);
        }
    }

    private parseDueDate(dateTimeStr: string): Date | null {
        const now = new Date();
        const [day, month, year] = dateTimeStr.split(/[/.:]/).map(Number);

        if (dateTimeStr.includes(':')) {
            // It's a time
            const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), day, month);
            if (dueDate < now) {
                dueDate.setDate(dueDate.getDate() + 1); // Set to tomorrow if the time has already passed today
            }
            return dueDate;
        } else {
            // It's a date
            const dueDate = new Date(year ? 2000 + year : now.getFullYear(), month - 1, day);
            if (dueDate < now) {
                dueDate.setFullYear(dueDate.getFullYear() + 1); // Set to next year if the date has already passed this year
            }
            return dueDate;
        }
    }
    private async handleLink(message: string, user: User): Promise<void> {
        const urlMatch = message.match(/(https?:\/\/\S+)/i);
        if (urlMatch) {
            const url = urlMatch[1];
            const extraText = message.replace(url, '').trim();
            try {
                const link = await dbLinks.createLink(url, user.dbId || "", extraText, new Date());
                if (link) {
                    await client.sendMessage("הקישור נשמר בהצלחה.", user.phone);
                } else {
                    throw new Error("נכשל ביצירת קישור");
                }
            } catch (error) {
                console.error('שגיאה בשמירת קישור:', error);
                await notifyAdminsError(`שגיאה בשמירת קישור עבור משתמש ${user.phone}: ${error}`);
                await client.sendMessage("אירעה שגיאה בשמירת הקישור. אנא נסה שוב.", user.phone);
            }
        } else {
            await client.sendMessage("לא זוהה קישור תקין בהודעה. אנא נסה שוב.", user.phone);
        }
    }

    private async handleNote(message: string, user: User): Promise<void> {
        try {
            const note = await dbNotes.createNote(message, user.dbId || "");
            if (note) {
                await client.sendMessage("ההערה נשמרה בהצלחה.", user.phone);
            } else {
                throw new Error("נכשל ביצירת הערה");
            }
        } catch (error) {
            console.error('שגיאה בשמירת הערה:', error);
            await notifyAdminsError(`שגיאה בשמירת הערה עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בשמירת ההערה. אנא נסה שוב.", user.phone);
        }
    }

    private findConversationHandler(from: string): ConversationHandler | undefined {
        return this.conversationHandlers.find((handler) => handler.getConvoPartner() === from);
    }

    private isAdmin(phoneNumber: string): boolean {
        return admins.includes(phoneNumber);
    }
}