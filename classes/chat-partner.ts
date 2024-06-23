export interface ChatPartner {
    dbId: string | undefined;
    phone: string;
    getDbId(): Promise<string>;
}