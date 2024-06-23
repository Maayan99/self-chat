// user.ts
import {ChatPartner} from "./chat-partner";

export class User implements ChatPartner{
    dbId?: string;
    phoneNumber: string;
    name?: string;

    constructor(phoneNumber: string, name?: string, dbId?: string) {
        this.dbId = dbId;
        this.phoneNumber = phoneNumber;
        this.name = name;
    }

    async getDbId(): Promise<string> {
        if (this.dbId) {
            return this.dbId;
        }
        const userId = await dbUsers.getUserByPhone(this.phoneNumber);
        this.dbId = userId;
        return userId;
    }
}
