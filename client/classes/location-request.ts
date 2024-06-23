import {OutboundMessage} from "./outbound-message";

/**
 * Represents a location request message to be sent to the WhatsApp API.
 * Implements the OutboundMessage interface.
 */
export class LocationRequest implements OutboundMessage {
    private readonly body: string;

    constructor(body: string) {
        this.body = body;
    }

    transformToApiRepresentation(): object {
        return {
            type: "location_request_message",
            body: {
                text: this.body,
            },
            action: {
                name: "send_location",
            },
        };
    }


    getApiType(): string {
        return "interactive";
    }
}