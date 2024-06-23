export type MessageType = 'text' | 'interactive' | 'location'

interface QuickReplyAnswerBody { 'title': string, 'id': string }
interface ListReplyAnswerBody { 'title': string, 'description': string, 'id': string }
interface LocationAnswerBody { 'latitude': string, 'longitude': string, 'address': string }


export class IncomingMessage {
    body: string | QuickReplyAnswerBody | LocationAnswerBody | ListReplyAnswerBody;
    id: string;
    from: string;
    contextId: string | undefined;
    type: MessageType;

    constructor(body: string | QuickReplyAnswerBody | LocationAnswerBody | ListReplyAnswerBody, id: string, from: string, type: MessageType, contextId?: string) {
        if ((type === 'text' && !(typeof body === 'string'))) {
            throw new Error("Bad message data")
        }
        this.contextId = contextId;
        this.body = body;
        this.id = id;
        this.from = from;
        this.type = type
    }
}