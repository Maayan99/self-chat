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
import {notifyAdminsError} from '../utils/admin-notifs-utility';
import {dbReminders} from "../db/db-reminders";
import {createTables, deleteTables} from "../db/db-initialization";


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
    private conversationHandlers: ConversationHandler[] = [];
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
            const existingHandler = this.findConversationHandler(from);
            if (existingHandler) {
                if (msgBody == 'בטל') {
                    existingHandler.deleteConvo();
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
            this.conversationHandlers.push(handler);
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
            this.conversationHandlers.push(handler);
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
            const reminderPattern = /(היום|מחר|ביום (ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)|\d{1,2}[/.]\d{1,2}([/.]\d{2,4})?|\d{1,2}:\d{2})(\s+ב?\d{1,2}:\d{2})?/i;
            const match = message.match(reminderPattern);

            if (match) {
                const dateTimeStr = match[1];
                const timeStr = match[4] ? match[4].trim().replace(/^ב/, '') : '';
                const dateTimeIndex = match.index || 0;
                const reminderText = message.slice(0, dateTimeIndex).trim() || message.slice(dateTimeIndex + match[0].length).trim();
                const dueDate = this.parseDueDate(dateTimeStr, timeStr);

                if (dueDate) {
                    const reminder = await dbReminders.createReminder(user.dbId || "", reminderText, dueDate);
                    if (reminder) {
                        remindersManager.addReminder(reminder);
                        await client.sendMessage(`התזכורת "${reminderText}" נשמרה בהצלחה ל-${dueDate.toLocaleString('he-IL')}.`, user.phone);
                    } else {
                        throw new Error("נכשל ביצירת תזכורת");
                    }
                } else {
                    await client.sendMessage("לא הצלחתי להבין את התאריך או השעה. אנא נסה שוב בפורמט: [תוכן] היום/מחר/ביום [יום בשבוע]/DD.MM/DD.MM.YY [HH:MM] או היום/מחר/ביום [יום בשבוע]/DD.MM/DD.MM.YY [HH:MM] [תוכן]", user.phone);
                }
            } else {
                await client.sendMessage("פורמט התזכורת לא תקין. אנא השתמש בפורמט: [תוכן] היום/מחר/ביום [יום בשבוע]/DD.MM/DD.MM.YY [HH:MM] או היום/מחר/ביום [יום בשבוע]/DD.MM/DD.MM.YY [HH:MM] [תוכן]", user.phone);
            }
        } catch (error) {
            console.error('שגיאה בשמירת תזכורת:', error);
            await notifyAdminsError(`שגיאה בשמירת תזכורת עבור משתמש ${user.phone}: ${error}`);
            await client.sendMessage("אירעה שגיאה בשמירת התזכורת. אנא נסה שוב.", user.phone);
        }
    }

    private parseDueDate(dateTimeStr: string, timeStr: string): Date | null {
        const now = new Date();
        const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        let dueDate = new Date(now);

        if (dateTimeStr.toLowerCase() === 'היום') {
            // Do nothing, dueDate is already set to today
        } else if (dateTimeStr.toLowerCase() === 'מחר') {
            dueDate.setDate(dueDate.getDate() + 1);
        } else if (dateTimeStr.startsWith('ביום')) {
            const dayName = dateTimeStr.split(' ')[1];
            const dayIndex = hebrewDays.indexOf(dayName);
            if (dayIndex !== -1) {
                const daysUntilDue = (dayIndex + 7 - now.getDay()) % 7;
                dueDate.setDate(dueDate.getDate() + daysUntilDue);
            } else {
                return null;
            }
        } else if (dateTimeStr.includes(':')) {
            // It's a time
            const [hours, minutes] = dateTimeStr.split(':').map(Number);
            dueDate.setHours(hours, minutes, 0, 0);
            if (dueDate < now) {
                dueDate.setDate(dueDate.getDate() + 1); // Set to tomorrow if the time has already passed today
            }
        } else {
            // It's a date
            const [day, month, year] = dateTimeStr.split(/[/.]/).map(Number);
            dueDate = new Date(year ? (year < 100 ? 2000 + year : year) : now.getFullYear(), month - 1, day);

            // Handle year rollover
            if (dueDate < now && !year) {
                dueDate.setFullYear(dueDate.getFullYear() + 1);
            }
        }

        // Set time if provided separately
        if (timeStr) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            dueDate.setHours(hours, minutes, 0, 0);
        } else if (!dateTimeStr.includes(':')) {
            // If no specific time was set, default to 8:00 AM
            dueDate.setHours(8, 0, 0, 0);
        }

        return dueDate > now ? dueDate : null;
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

    private findConversationHandler(from: string): ConversationHandler | undefined {
        return this.conversationHandlers.find((handler) => handler.getConvoPartner() === from);
    }

    public addConversationHandler(handler: ConversationHandler): void {
        this.conversationHandlers.push(handler);

        console.log("Created a new convo handler! ")
        console.log("New amount of conversations: " + this.conversationHandlers.length)
    }

    public removeConversationHandler(handler: ConversationHandler): void {
        const index: number = this.conversationHandlers.indexOf(handler);
        if (index !== -1) {
            this.conversationHandlers.splice(index, 1);
        }

        console.error("Deleting conversation! ")
        console.log("Conversations left standing: " + this.conversationHandlers.length)
    }

    private isAdmin(phoneNumber: string): boolean {
        return admins.includes(phoneNumber);
    }
}