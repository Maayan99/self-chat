export class Reminder {
    dbId: string;
    userId: string;
    reminderText: string;
    dueDate: Date;
    isCompleted: boolean;
    createdAt: Date;

    constructor(dbId: string, userId: string, reminderText: string, dueDate: Date, isCompleted: boolean = false, createdAt: Date = new Date()) {
        this.dbId = dbId;
        this.userId = userId;
        this.reminderText = reminderText;
        this.dueDate = dueDate;
        this.isCompleted = isCompleted;
        this.createdAt = createdAt;
    }
}