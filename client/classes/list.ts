import {OutboundMessage} from "./outbound-message";
import {Button} from "./buttons";


type Section = { 'title': string, 'rows': Button[] }

/**
 * Represents a location request message to be sent to the WhatsApp API.
 * Implements the OutboundMessage interface.
 */
class List implements OutboundMessage{
    private readonly body: string;
    private buttonDescription: string; // the list's initial button description
    private sections: Section[];

    constructor(body: string, buttonDescription: string, sections: Section[]) {
        this.body = body
        this.buttonDescription = buttonDescription
        this.sections = sections
    }

    getApiType(): string {
        return 'interactive';
    }

    transformToApiRepresentation() {
        return {
            "type": "list",
            "body": {
                "text": this.body
            },
            "action":
                {
                    "button": this.buttonDescription,
                    "sections": this.sections.map((section: Section) => {
                        return {
                            "title": section.title,
                            "rows": section.rows.map((button: Button) => {
                                return {
                                    "id": button.id,
                                    "title": button.title,
                                    "description": button.description
                                }
                            })

                        }
                    })
                }
        }
    }
}

export { List, Section }