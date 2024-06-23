import {OutboundMessage} from "./outbound-message";

type Button = {
    id: string,
    title: string,
    description?: string
}

/**
 * Represents a buttons message to be sent to the WhatsApp API.
 * Implements the OutboundMessage interface.
 */
class Buttons implements OutboundMessage {
    private readonly body: string
    private buttons: Button[]

    constructor(body: string, buttons: Button[]) {
        this.body = body
        this.buttons = buttons
    }


    getApiType(): string {
        return 'interactive';
    }

    transformToApiRepresentation() {
        return {
            "type": "button",
            "body": {
                "text": this.body
            },
            "action":
                {
                    buttons: this.buttons.map((button) => {
                        return {
                            "type": "reply",
                            "reply":
                                {
                                    "id": button.id,
                                    "title": button.title
                                }
                        }
                    })
                }
        }
    }
}

export {Button, Buttons}