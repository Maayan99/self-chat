export interface ChatPartner {
    dbId?: string;
    phone: string;
    getDbId(): Promise<string | null>;
}