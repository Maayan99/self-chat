import {IncomingMessage} from '../client/classes/incoming-message';
import {User} from '../classes/user';
import {Admin} from '../classes/admin';
import {ChatPartner} from '../classes/chat-partner';
import {dbUsers} from '../db/db-users';
import {dbNotes} from '../db/db-notes';
import {dbLinks} from '../db/db-links';
import {adminRoot} from '../trees/admin/admin-root';
import {onboardingRoot} from '../trees/onboarding/root-node';
import {ConversationHandler} from '../conversation-handler/conversation-handler';
import {client, admins, messageHandler, remindersManager} from '../main';
import {Exporter} from './exporter';
import {notifyAdminsError, notifyAdminsUpdate} from '../utils/admin-notifs-utility';
import {dbReminders} from "../db/db-reminders";
import {createTables, deleteTables} from "../db/db-initialization";
import { parse, addDays, setHours, setMinutes, isBefore, isSameDay, addWeeks, addHours, addMinutes, setDay } from 'date-fns';


const HELP_MESSAGE = `
היי חבר! 👋 איזה כיף שאתה כאן. בוא אספר לך מה אפשר לעשות:

📝 להוסיף הערה:
   פשוט שלח לי טקסט, ואני אשמור אותו בשבילך.

🔗 לשמור קישור:
   שלח לי URL, ואם תרצה - הוסף תיאור לפניו או אחריו.

⏰ ליצור תזכורת:
   כתוב הודעה עם תאריך או שעה, למשל:
   "מחר ב-14:30 פגישה עם יוסי" או "15/07 לקנות מתנה לאמא"

📊 לקבל את המידע שלך:
   • שלח "הערות" או "לינקים" לקבלת רשימה בהודעה
   • הוסף "אקסל" או "וורד" בסוף אם תרצה קובץ, למשל: "הערות אקסל"

🆘 לקבל עזרה:
   תמיד תוכל לשלוח "עזרה" כדי לראות את ההודעה הזו שוב.

אני כאן בשבילך! כל הודעה שתשלח תקבל ממני תגובה עם אימוג'י:
👍 

בוא נתחיל! מה תרצה לעשות קודם? 😊
`;



export class MessageHandler {
    private conversationHandlers: Map<string, ConversationHandler> = new Map();
    private exporter: Exporter;

    constructor() {
        this.exporter = new Exporter();
    }

    async handleMessage(message: IncomingMessage): Promise<void> {
        const from = message.from;
        const msgBody = typeof message.body === 'string' ? message.body.trim() : '';

        try {
            // Handle help message
            if (msgBody === 'עזרה') {
                await this.sendHelpMessage(from);
                return;
            }

            // Check for existing conversation handler
            const existingHandler = this.conversationHandlers.get(from);
            if (existingHandler) {
                if (msgBody === 'בטל') {
                    await this.deleteConversationHandler(from);
                    await client.reactToMessage(message.id, '👍', from);
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
                    let user = await this.getOrCreateUser(from);
                    if (user === null) {
                        return;
                    }
                    if (!user) {
                        throw new Error(`נכשל ביצירת משתמש עבור מספר טלפון: ${from}`);
                    }
                    await this.handleCustomerMessage(new IncomingMessage(customerMessage, message.id, from, message.type, message.contextId), user);
                } else {
                    await this.startAdminDashboard(from);
                }
                return;
            }

            // Check if user exists in DB, create if not
            let user = await this.getOrCreateUser(from);
            if (user === null) {
                return;
            }
            if (!user) {
                throw new Error(`נכשל ביצירת משתמש עבור מספר טלפון: ${from}`);
            }

            // Handle customer message
            await this.handleCustomerMessage(message, user);
        } catch (error) {
            console.error('שגיאה בטיפול בהודעה:', error);
            await notifyAdminsError(`שגיאה בטיפול בהודעה ממספר ${from}: ${error}`);
            await client.sendMessage("אירעה שגיאה בעיבוד ההודעה שלך, אנא נסה שוב", from);
        }
    }

    private async getOrCreateUser(phoneNumber: string): Promise<User | undefined | null> {
        try {
            let user = await dbUsers.getUserByPhone(phoneNumber);
            if (!user) {
                user = await dbUsers.createUser(phoneNumber);
                if (user) {
                    await this.startOnboarding(user);
                    return null;
                }
            }
            return user || undefined;
        } catch (error) {
            console.error('שגיאה ביצירת או אחזור משתמש:', error);
            await notifyAdminsError(`שגיאה ביצירת או אחזור משתמש עבור מספר ${phoneNumber}: ${error}`);
            return undefined;
        }
    }

    private async startOnboarding(user: User): Promise<void> {
        try {
            const handler = new ConversationHandler(onboardingRoot, user, client);
            notifyAdminsUpdate('יצרתי שיחה עם משתמש חדש ' + handler.getConvoPartner() + ". סה״כ שיחות: " + this.conversationHandlers.size);
            await handler.startConversation();
        } catch (error) {
            console.error('שגיאה בתהליך ה-onboarding:', error);
            await notifyAdminsError(`שגיאה בתהליך ה-onboarding עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בתהליך ההרשמה שלך, אנא נסה שוב", user.phone);
        }
    }

    private async startAdminDashboard(from: string): Promise<void> {
        try {
            const admin = new Admin(from);
            const handler = new ConversationHandler(adminRoot, admin, client);
            await handler.startConversation();
        } catch (error) {
            console.error('שגיאה בהפעלת לוח המחוונים של המנהל:', error);
            await notifyAdminsError(`שגיאה בהפעלת לוח המחוונים של המנהל עבור ${from}: ${error}`);
            await client.sendMessage("אירעה שגיאה בהפעלת לוח המחוונים. אנא נסה שוב מאוחר יותר.", from);
        }
    }

    private async sendHelpMessage(from: string): Promise<void> {
        await client.sendMessage(HELP_MESSAGE, from);
    }

    private async handleCustomerMessage(message: IncomingMessage, user: User): Promise<void> {
        const phone = user ? user.phone : message.from;
        const msgBody = typeof message.body === 'string' ? message.body.trim() : '';

        try {
            if (this.isExportCommand(msgBody)) {
                await this.handleExportCommand(msgBody, user);
            } else if (this.isReminder(msgBody)) {
                await this.handleReminder(msgBody, user);
            } else if (this.isLink(msgBody)) {
                await this.handleLink(msgBody, user);
            } else {
                await this.handleNote(msgBody, user);
            }
            await client.reactToMessage(message.id, '👍', phone);
        } catch (error) {
            console.error('שגיאה בטיפול בהודעת לקוח:', error);
            await notifyAdminsError(`שגיאה בטיפול בהודעת לקוח ממספר ${phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בעיבוד ההודעה שלך, אנא נסה שוב", phone);
        }
    }

    private isExportCommand(message: string): boolean {
        return /^(הערות|לינקים)(\s+(pdf|הודעה|אקסל|וורד))?$/.test(message);
    }

    private async handleExportCommand(command: string, user: User): Promise<void> {
        const [exportType, format = 'הודעה'] = command.split(/\s+/);

        try {
            await this.exporter.export(user, exportType, format);
        } catch (error) {
            console.error('שגיאת ייצוא:', error);
            await notifyAdminsError(`שגיאת ייצוא עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה במהלך תהליך הייצוא. אנא נסה שוב מאוחר יותר.", user.phone);
        }
    }

    private isLink(message: string): boolean {
        const urlPattern = /https?:\/\/\S+/i;
        return urlPattern.test(message);
    }
    private isReminder(message: string): boolean {
        const reminderPattern = /(היום|מחר|ביום (ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)|\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?|\d{1,2}:\d{2})/i;
        return reminderPattern.test(message);
    }

    private async handleReminder(message: string, user: User): Promise<void> {
        try {
            const dueDate = this.parseDueDate(message);
            if (dueDate) {
                const reminderText = message.replace(/(\d{1,2})[:.]\d{2}|היום|מחר|\b(ב?-?\s?)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(\s?(הבא|הקרוב))?\b|\b(אחת|שתיים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|אחת עשרה|שתים עשרה)\b|בבוקר|בערב|בלילה|בעוד (שעתיים|שעה|חצי שעה|רבע שעה)/g, '').trim();
                const reminder = await dbReminders.createReminder(user.dbId || "", reminderText, dueDate);
                if (reminder) {
                    remindersManager.addReminder(reminder);
                } else {
                    throw new Error("נכשל ביצירת תזכורת");
                }
            } else {
                await client.sendMessage("לא הצלחתי להבין את התאריך או השעה. אנא נסה שוב.", user.phone);
            }
        } catch (error) {
            console.error('שגיאה בשמירת תזכורת:', error);
            await notifyAdminsError(`שגיאה בשמירת תזכורת עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בשמירת התזכורת. אנא נסה שוב.", user.phone);
        }
    }

    private parseDueDate(dateTimeStr: string): Date | null {
        const now = new Date();
        let dueDate = new Date(now);
        const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

        // Normalize the input string
        dateTimeStr = dateTimeStr.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

        // Check for "היום" (today) or "מחר" (tomorrow)
        if (dateTimeStr.includes('היום')) {
            // Keep dueDate as is
        } else if (dateTimeStr.includes('מחר')) {
            dueDate = addDays(dueDate, 1);
        } else {
            // Check for day of the week with context
            for (let i = 0; i < hebrewDays.length; i++) {
                if (dateTimeStr.includes(hebrewDays[i])) {
                    dueDate = this.parseContextAwareDay(dateTimeStr, i);
                    break;
                }
            }
        }

        // Parse time
        dueDate = this.parseTime(dateTimeStr, dueDate);

        // Handle fuzzy time
        dueDate = this.parseFuzzyTime(dateTimeStr, dueDate);

        // Ensure the due date is in the future
        while (isBefore(dueDate, now)) {
            dueDate = addDays(dueDate, 1);
        }

        return dueDate;
    }

    private parseContextAwareDay(dateStr: string, dayIndex: number): Date {
        const now = new Date();
        let dueDate = setDay(now, dayIndex);
        if (dateStr.includes('הבא') || dateStr.includes('הקרוב')) {
            if (isBefore(dueDate, now) || isSameDay(dueDate, now)) {
                dueDate = addWeeks(dueDate, 1);
            }
        } else if (isBefore(dueDate, now) || isSameDay(dueDate, now)) {
            dueDate = addWeeks(dueDate, 1);
        }
        return dueDate;
    }

    private parseTime(dateTimeStr: string, dueDate: Date): Date {
        const timeWords = {
            'אחת': 13, 'שתיים': 14, 'שלוש': 15, 'ארבע': 16,
            'חמש': 17, 'שש': 18, 'שבע': 19, 'שמונה': 20,
            'תשע': 21, 'עשר': 22, 'אחת עשרה': 23, 'שתים עשרה': 12
        };

        let timeMatch = dateTimeStr.match(/(\d{1,2})[:.]?(\d{2})/);
        if (timeMatch) {
            let [, hours, minutes] = timeMatch.map(Number);
            dueDate = setHours(setMinutes(dueDate, minutes), hours);
        } else {
            for (const [word, hour] of Object.entries(timeWords)) {
                if (dateTimeStr.includes(word)) {
                    let adjustedHour = hour;
                    if (dateTimeStr.includes('בערב') || dateTimeStr.includes('בלילה')) {
                        adjustedHour = hour < 12 ? hour + 12 : hour;
                    } else if (dateTimeStr.includes('בבוקר') && hour > 12) {
                        adjustedHour = hour - 12;
                    }
                    dueDate = setHours(dueDate, adjustedHour);
                    dueDate = setMinutes(dueDate, 0);
                    break;
                }
            }
        }

        // Default times for "בבוקר" and "בערב"
        if (dateTimeStr.includes('בבוקר') && !timeMatch && !Object.keys(timeWords).some(word => dateTimeStr.includes(word))) {
            dueDate = setHours(setMinutes(dueDate, 0), 8);
        } else if (dateTimeStr.includes('בערב') && !timeMatch && !Object.keys(timeWords).some(word => dateTimeStr.includes(word))) {
            dueDate = setHours(setMinutes(dueDate, 0), 20);
        }

        return dueDate;
    }

    private parseFuzzyTime(dateTimeStr: string, dueDate: Date): Date {
        if (dateTimeStr.includes('בעוד שעתיים')) {
            return addHours(dueDate, 2);
        } else if (dateTimeStr.includes('בעוד שעה')) {
            return addHours(dueDate, 1);
        } else if (dateTimeStr.includes('בעוד חצי שעה')) {
            return addMinutes(dueDate, 30);
        } else if (dateTimeStr.includes('בעוד רבע שעה')) {
            return addMinutes(dueDate, 15);
        }
        // Add more fuzzy time parsing logic here if needed
        return dueDate;
    }

    private async handleLink(message: string, user: User): Promise<void> {
        const urlMatch = message.match(/(https?:\/\/\S+)/i);
        if (urlMatch) {
            const url = urlMatch[1];
            const extraText = message.replace(url, '').trim();
            try {
                const link = await dbLinks.createLink(url, user.dbId || "", extraText, new Date());
                if (!link) {
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
            if (!note) {
                throw new Error("נכשל ביצירת הערה");
            }
        } catch (error) {
            console.error('שגיאה בשמירת הערה:', error);
            await notifyAdminsError(`שגיאה בשמירת הערה עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בשמירת ההערה. אנא נסה שוב.", user.phone);
        }
    }

    private async deleteConversationHandler(from: string): Promise<void> {
        const handler = this.conversationHandlers.get(from);
        if (handler) {
            await handler.deleteConvo();
            this.conversationHandlers.delete(from);
            console.log(`Deleted conversation handler for ${from}. Remaining handlers: ${this.conversationHandlers.size}`);
        }
    }

    public addConversationHandler(handler: ConversationHandler): void {
        this.conversationHandlers.set(handler.getConvoPartner(), handler);
        console.log(`Added a new conversation handler for ${handler.getConvoPartner()}. Total handlers: ${this.conversationHandlers.size}`);
    }

    public removeConversationHandler(handler: ConversationHandler): void {
        const from = handler.getConvoPartner();
        if (this.conversationHandlers.delete(from)) {
            console.log(`Removed conversation handler for ${from}. Remaining handlers: ${this.conversationHandlers.size}`);
        }
    }
    private isAdmin(phoneNumber: string): boolean {
        return admins.includes(phoneNumber);
    }
}