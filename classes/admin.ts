import {ChatPartner} from "./chat-partner";

export class Admin implements ChatPartner {
    dbId: string | undefined
    phone: string

    constructor(phone: string, dbId?: string) {
        this.dbId = dbId
        this.phone = phone
    }

    public async getDbId(): Promise<string> {
        if (!this.dbId) {
            this.dbId = "0000" // TODO: Implement actual admin db
        }
        return this.dbId
    }
}