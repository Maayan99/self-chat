// user.ts
import {ChatPartner} from "./chat-partner";
import {dbUsers} from "../db/db-users";

export class User implements ChatPartner{
    dbId?: string;
    phone: string;

    constructor(phoneNumber: string, dbId?: string) {
        this.dbId = dbId;
        this.phone = phoneNumber;
    }

    async getDbId(): Promise<string | null> {
        if (this.dbId) {
            return this.dbId;
        }
        const userId: User | null = await dbUsers.getUserByPhone(this.phone);
        if (userId === null) {
            return null;
        }

        // TODO: find a better solution for this stupid shit
        // @ts-ignore
        const newId: string = userId.dbId;
        this.dbId = newId;
        return newId;
    }
}
