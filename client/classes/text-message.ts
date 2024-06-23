import {OutboundMessage} from "./outbound-message";

/**
 * Represents a text message to be sent to the WhatsApp API.
 * Implements the OutboundMessage interface.
 */
export class TextMessage implements OutboundMessage {
    body: string;

    constructor(body: string) {
        this.body = body
    }


    getApiType(): string {
        return 'text';
    }

    transformToApiRepresentation(): object {
        return {
            "preview_url": false,
            "body": this.body,
        }
    }
}