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
import {
    parse,
    addDays,
    setHours,
    setMinutes,
    isBefore,
    isSameDay,
    addWeeks,
    addHours,
    addMinutes,
    setDay,
    isValid, startOfDay
} from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';


const TIMEZONE = 'Asia/Jerusalem'; // Israel Standard Time



const HELP_MESSAGE = `
היי חבר! 👋 בוא נצלול לכל מה שאפשר לעשות כאן:

1. 📝 הערות:
   כל מה שתשלח שלא נראה כמו פקודה, אני אשמור בתור הערה. פשוט וקל!

2. 🔗 קישורים:
   שלח לי URL ואשמור אותו. רוצה להוסיף תיאור? כתוב אותו לפני או אחרי הלינק.

3. ⏰ תזכורות:
   כתוב משהו עם תאריך או שעה, ואני אזכיר לך. למשל:
   "מחר ב-14:30 פגישה עם יוסי"
   "15/07 לקנות מתנה לאמא"
   "בעוד שעתיים לצאת מהבית"

4. 📊 לקבל את המידע שלך:
   • שלח "הערות" או "לינקים" לקבלת רשימה בהודעה
   • הוסף "אקסל" או "וורד" לקבלת קובץ, למשל: "הערות אקסל"

5. 🗑️ למחוק מידע:
   • "מחק הערות" - מוחק את כל ההערות שלך
   • "מחק לינקים" - מוחק את כל הלינקים שלך
   • "מחק תזכורות" - מוחק את כל התזכורות שלך
   • "מחק הכל" - מוחק את כל המידע שלך

שים לב: כל המידע נמחק אוטומטית אחרי 30 יום לשמירה על פרטיותך! 🔒

צריך עזרה? תמיד אפשר לשלוח "עזרה" ואני כאן! 😊
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
            if (this.isDeleteCommand(msgBody)) {
                await this.handleDeleteCommand(msgBody, user);
                await client.reactToMessage(message.id, '🗑️', phone);
            } else if (this.isExportCommand(msgBody)) {
                await this.handleExportCommand(msgBody, user);
                await client.reactToMessage(message.id, '📁', phone);
            } else if (this.isReminder(msgBody)) {
                await this.handleReminder(msgBody, user);
                await client.reactToMessage(message.id, '📅', phone);
            } else if (this.isLink(msgBody)) {
                await this.handleLink(msgBody, user);
                await client.reactToMessage(message.id, '🔗', phone);
            } else {
                await this.handleNote(msgBody, user);
                await client.reactToMessage(message.id, '✍️', phone);
            }
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
        const reminderPatterns = [
            /\b(היום|מחר|בעוד|ב|ל)\s*(שעה|שעתיים|דקות?|חצי שעה|רבע שעה|\d+:\d+|\d+[:.]\d+)\b/i,
            /\b(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\b/i,
            /\b\d{1,2}[./]\d{1,2}([./]\d{2,4})?\b/,
            /\b(בבוקר|בצהריים|אחה"צ|בערב|בלילה)\b/i,
            /\b(אחת|שתיים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|אחת עשרה|שתים עשרה)\b/i
        ];

        return reminderPatterns.some(pattern => pattern.test(message));
    }
    private isDeleteCommand(message: string): boolean {
        return /^מחק (הכל|לינקים|הערות|תזכורות)$/i.test(message);
    }

    private async handleDeleteCommand(command: string, user: User): Promise<void> {
        const type = command.split(' ')[1].toLowerCase();

        switch (type) {
            case 'הכל':
                await this.deleteAllForUser(user);
                break;
            case 'לינקים':
                await this.deleteAllLinksForUser(user);
                break;
            case 'הערות':
                await this.deleteAllNotesForUser(user);
                break;
            case 'תזכורות':
                await this.deleteAllRemindersForUser(user);
                break;
            default:
                throw new Error('פקודת מחיקה לא חוקית');
        }
    }

    private async deleteAllForUser(user: User): Promise<void> {
        await Promise.all([
            this.deleteAllLinksForUser(user),
            this.deleteAllNotesForUser(user),
            this.deleteAllRemindersForUser(user)
        ]);
        await client.sendMessage('כל הלינקים, ההערות והתזכורות נמחקו בהצלחה.', user.phone);
    }

    private async deleteAllLinksForUser(user: User): Promise<void> {
        await dbLinks.deleteAllLinksForUser(user.dbId || "");
        await client.sendMessage('כל הלינקים נמחקו בהצלחה.', user.phone);
    }

    private async deleteAllNotesForUser(user: User): Promise<void> {
        await dbNotes.deleteAllNotesForUser(user.dbId || "");
        await client.sendMessage('כל ההערות נמחקו בהצלחה.', user.phone);
    }

    private async deleteAllRemindersForUser(user: User): Promise<void> {
        await dbReminders.deleteAllRemindersForUser(user.dbId || "");
        await remindersManager.removeAllRemindersForUser(user.dbId || "");
        await client.sendMessage('כל התזכורות נמחקו בהצלחה.', user.phone);
    }

    private async handleReminder(message: string, user: User): Promise<void> {
        try {
            const dueDate = this.parseDueDate(message);
            if (dueDate) {
                const reminderText = message.replace(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?|(\d{1,2})[:.](\d{2})|היום|מחר|\b(ב?-?\s?)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(\s?(הבא|הקרוב))?\b|\b(אחת|שתיים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|אחת עשרה|שתים עשרה)\b|בבוקר|בצהריים|אחה"צ|בערב|בלילה|בעוד (שעתיים|שעה|חצי שעה|רבע שעה|\d+ דקות)/gi, '').trim();
                const reminder = await dbReminders.createReminder(user.dbId || "", reminderText, dueDate);
                if (reminder) {
                    remindersManager.addReminder(reminder);
                    const zonedDueDate = utcToZonedTime(dueDate, TIMEZONE);
                    await client.sendMessage(`התזכורת "${reminderText}" נשמרה בהצלחה ל-${zonedDueDate.toLocaleString('he-IL')}.`, user.phone);
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
        let dueDate = utcToZonedTime(now, TIMEZONE);
        let timeSet = false;

        dateTimeStr = dateTimeStr.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

        // Handle fuzzy time expressions
        const fuzzyDate = this.parseFuzzyTime(dateTimeStr, dueDate);
        if (fuzzyDate) {
            return zonedTimeToUtc(fuzzyDate, TIMEZONE);
        }

        // Handle "היום" and "מחר"
        if (dateTimeStr.includes('היום')) {
            dueDate = startOfDay(dueDate);
        } else if (dateTimeStr.includes('מחר')) {
            dueDate = startOfDay(addDays(dueDate, 1));
        } else {
            // Handle specific date
            const dateMatch = dateTimeStr.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
            if (dateMatch) {
                const [, day, month, year] = dateMatch.map(Number);
                dueDate = utcToZonedTime(new Date(year ? (year < 100 ? 2000 + year : year) : dueDate.getFullYear(), month - 1, day), TIMEZONE);
                dueDate = startOfDay(dueDate);
            } else {
                // Handle day of the week
                dueDate = this.parseDayOfWeek(dateTimeStr, dueDate);
            }
        }

        // Parse time
        const timeDate = this.parseTime(dateTimeStr, dueDate);
        if (timeDate) {
            dueDate = timeDate;
            timeSet = true;
        }

        // If no specific time was set, default to 8:00 AM
        if (!timeSet) {
            dueDate = setHours(setMinutes(dueDate, 0), 8);
        }

        // Ensure the due date is in the future
        while (isBefore(dueDate, now)) {
            dueDate = addDays(dueDate, 1);
        }

        return zonedTimeToUtc(dueDate, TIMEZONE);
    }

    private parseContextAwareDay(dateStr: string, dayIndex: number): Date {
        const now = utcToZonedTime(new Date(), TIMEZONE);
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

    private parseDayOfWeek(dateTimeStr: string, baseDate: Date): Date {
        const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        for (let i = 0; i < hebrewDays.length; i++) {
            if (dateTimeStr.includes(hebrewDays[i])) {
                let dueDate = setDay(baseDate, i);
                if (dateTimeStr.includes('הבא') || dateTimeStr.includes('הקרוב') || isBefore(dueDate, baseDate)) {
                    dueDate = addWeeks(dueDate, 1);
                }
                return startOfDay(dueDate);
            }
        }
        return baseDate;
    }



    private parseTime(dateTimeStr: string, baseDate: Date): Date | null {
        const timeWords = {
            'אחת': 13, 'שתיים': 14, 'שלוש': 15, 'ארבע': 16,
            'חמש': 17, 'שש': 18, 'שבע': 19, 'שמונה': 20,
            'תשע': 21, 'עשר': 22, 'אחת עשרה': 23, 'שתים עשרה': 12
        };

        // Check for word-based times first
        for (const [word, hour] of Object.entries(timeWords)) {
            if (dateTimeStr.includes(word)) {
                let adjustedHour = hour;
                if (dateTimeStr.includes('בערב') || dateTimeStr.includes('בלילה')) {
                    adjustedHour = hour < 12 ? hour + 12 : hour;
                } else if (dateTimeStr.includes('בבוקר') && hour > 12) {
                    adjustedHour = hour - 12;
                }
                return setHours(setMinutes(baseDate, 0), adjustedHour);
            }
        }

        // Check for specific time format
        const timeMatch = dateTimeStr.match(/(\d{1,2})[:.](\d{2})/);
        if (timeMatch) {
            const [, hours, minutes] = timeMatch.map(Number);
            return setHours(setMinutes(baseDate, minutes), hours);
        }

        // Handle "בבוקר" and "בערב" without specific time
        if (dateTimeStr.includes('בבוקר')) {
            return setHours(setMinutes(baseDate, 0), 8);
        } else if (dateTimeStr.includes('בערב')) {
            return setHours(setMinutes(baseDate, 0), 20);
        }

        return null;
    }

    private parseFuzzyTime(dateTimeStr: string, baseDate: Date): Date | null {
        const fuzzyMatches = {
            'בעוד שעתיים': 2 * 60,
            'בעוד שעה': 60,
            'בעוד חצי שעה': 30,
            'בעוד רבע שעה': 15
        };

        for (const [phrase, minutes] of Object.entries(fuzzyMatches)) {
            if (dateTimeStr.includes(phrase)) {
                return addMinutes(baseDate, minutes);
            }
        }

        const numericMatch = dateTimeStr.match(/בעוד (\d+) (דקות|שעות)/);
        if (numericMatch) {
            const [, amount, unit] = numericMatch;
            const minutes = unit === 'דקות' ? parseInt(amount) : parseInt(amount) * 60;
            return addMinutes(baseDate, minutes);
        }

        return null;
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