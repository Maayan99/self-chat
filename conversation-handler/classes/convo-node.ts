import {VarAppend, VarRead} from "./convo-vars"
import {Button, Buttons} from "../../client/classes/buttons";
import {IncomingMessage} from "../../client/classes/incoming-message";
import {LocationRequest} from "../../client/classes/location-request";
import {OutboundMessage} from "../../client/classes/outbound-message";
import {List, Section} from "../../client/classes/list";
import {AddOrder} from "../conversation-handler";


type ButtonMessageGenerator = {
    'id': string,
    'title': ((read: VarRead) => string)
    'description'?: (((read: VarRead) => string))
}

type SectionRowGenerator = ((read: VarRead) => Button[])

export type SectionGenerator = {
    'title': ((read: VarRead) => string) | string
    'rows': SectionRowGenerator | Button[]
}

export type SectionsGenerator = ((read: VarRead) => Section[])

type NodeType = 'open' | 'buttons' | 'list' | 'location';
type NodeMessage = {
    'title'?: string | ((read: VarRead) => string),
    'body': string | ((read: VarRead) => string),
    'buttons'?: (Button[] | ButtonMessageGenerator[]),
    'buttonDescription'?: string | ((read: VarRead) => string),
    'sections'?: (Section[] | SectionGenerator[] | SectionsGenerator),
}

export type AnswerHandler =
    ConvoNode
    | null
    |
    (((input: IncomingMessage | undefined, read: VarRead, append: VarAppend) => ConvoNode) |
        ((input: IncomingMessage | undefined, read: VarRead, append: VarAppend) => Promise<ConvoNode>))
    |
    (((input: IncomingMessage | undefined, read: VarRead, append: VarAppend, addOrder: AddOrder) => ConvoNode) |
        ((input: IncomingMessage | undefined, read: VarRead, append: VarAppend, addOrder: AddOrder) => Promise<ConvoNode>))
    |
    (((input: IncomingMessage | undefined, read: VarRead, append: VarAppend) => null) |
        ((input: IncomingMessage | undefined, read: VarRead, append: VarAppend) => Promise<null>))
    |
    (((input: IncomingMessage | undefined, read: VarRead, append: VarAppend, addOrder: AddOrder) => null) |
        ((input: IncomingMessage | undefined, read: VarRead, append: VarAppend, addOrder: AddOrder) => Promise<null>))


// Open stands for "open question" i.e. a text message
const OPEN: string = "open"
const BUTTONS: string = "buttons"
const LIST: string = "list"
const LOCATION: string = 'location'

export class ConvoNode {
    type: NodeType;
    title?: string | ((read: VarRead) => string);
    body?: string | ((read: VarRead) => string);
    buttons?: Button[] | ButtonMessageGenerator[];
    buttonDescription?: string | ((read: VarRead) => string);
    sections?: Section[] | SectionGenerator[] | SectionsGenerator;
    continueAutomatically?: boolean;
    handlers: { [key: string]: AnswerHandler };

    /**
     * Creates a new Node instance.
     * @param type The type of the node ('open', 'buttons', 'list', or 'location').
     * @param message Message data (text and buttons)
     * @param handlers An object containing the handlers for each possible user response.
     * @param continueAutomatically whether to continue automatically onto the next node
     */
    constructor(
        type: NodeType,
        message: NodeMessage,
        handlers: { [key: string]: AnswerHandler },
        continueAutomatically?: boolean,
    ) {
        this.type = type;
        this.title = message.title;
        this.body = message.body;
        this.buttonDescription = message.buttonDescription;
        this.buttons = message.buttons;
        this.sections = message.sections;
        this.continueAutomatically = continueAutomatically;
        this.handlers = handlers;
    }


    /**
     * Generates a dynamic title using the provided titleGenerator function, if it exists.
     */
    private generateTitle(read: VarRead): string | undefined {
        if (typeof (this.title) === "function") {
            return this.title(read);
        } else {
            return this.title
        }
    }


    /**
     * Generates a dynamic body using the provided bodyGenerator function, if it exists.
     */
    private generateBody(read: VarRead): string | undefined {
        if (typeof (this.body) === "function") {
            return this.body(read);
        } else {
            return this.body
        }
    }

    /**
     * Generates a dynamic buttonDescription using the provided buttonDescriptionGenerator function, if it exists.
     */
    private generateButtonDescription(read: VarRead): string | undefined {
        if (typeof this.buttonDescription === "function") {
            return this.buttonDescription(read);
        } else {
            return this.buttonDescription
        }
    }


    /**
     * Generates dynamic buttons using the provided buttonGenerators array of functions, if it exists.
     * Each button will be either used as is or dictated by the function.
     */
    private generateButtons(read: VarRead): Button[] | undefined {
        let buttons: Button[] | undefined = this.buttons && Array<Button>(this.buttons.length);

        if (this.buttons && buttons) {
            for (let i = 0; i < this.buttons.length; i++) {
                const dynamicButton = this.buttons[i]
                const dynamicTitle = dynamicButton.title
                if (typeof dynamicTitle === "function") {
                    buttons.push({id: dynamicButton.id, title: dynamicTitle(read)});
                } else {
                    buttons.push({id: dynamicButton.id, title: dynamicTitle})
                }
            }
        }

        return buttons
    }


    /**
     * Generates dynamic sections using the provided sectionGenerator array of functions, if it exists.
     * If the buttons array is undefined, it initializes it with an array of length 3.
     */
    private generateSections(read: VarRead): Section[] | undefined {
        let sections: Section[] | undefined = this.sections && Array<Section>(this.sections.length)

        if (this.sections && sections) {
            if (typeof this.sections === 'function') {
                sections = this.sections(read)
            } else {
                for (let i = 0; i < this.sections.length; i++) {
                    const dynamicSection: SectionGenerator | Section = this.sections[i]
                    const dynamicSectionTitle = dynamicSection.title
                    let sectionTitle: string | undefined;

                    // Generate section title
                    if (typeof dynamicSectionTitle === "function") {
                        sectionTitle = dynamicSectionTitle(read)
                    } else {
                        sectionTitle = dynamicSectionTitle
                    }

                    const dynamicSectionRows: Button[] | SectionRowGenerator = dynamicSection.rows
                    let sectionRows: Button[];

                    if (typeof dynamicSectionRows === "function") {
                        sectionRows = dynamicSectionRows(read)
                    } else {
                        sectionRows = dynamicSectionRows
                    }

                    // Initialize the new section
                    let section: Section = {title: sectionTitle, rows: sectionRows};
                    sections.push(section)
                }
            }
        }

        return sections
    }

    /**
     * Generate the message this node sends dynamically
     * @param read the read function to access the conversation vars
     */
    public generateMessage(read: VarRead): string | OutboundMessage {
        const title: string | undefined = this.generateTitle(read);
        const body: string | undefined = this.generateBody(read);
        const buttons: Button[] | undefined = this.generateButtons(read);
        const sections: Section[] | undefined = this.generateSections(read);
        const buttonDescription: string | undefined = this.generateButtonDescription(read);


        switch (this.type) {
            case OPEN:
                return `${title || ''}${title ? "\n\n" : ''}${body || ''}`;
            case BUTTONS:
                if (body && buttons) {
                    return new Buttons(body, buttons);
                } else {
                    throw new Error("Buttons node doesn't have a body or a buttons field!");
                }
            case LIST:
                if (body && sections && buttonDescription) {
                    return new List(body, buttonDescription, sections);
                } else {
                    throw new Error("List node doesn't have a sections or a button description!");
                }
            case LOCATION:
                return new LocationRequest(body || '')
        }

        return ""
    }


    /**
     * Checks if the structure of this node and its child nodes is valid.
     * @returns True if the structure is valid, false otherwise. If false, an informative message will be returned as well
     */
    public checkStructure(): void {
        if (!this.body) {
            throw new Error('Node does not have a body!');
        }

        // Check if all buttons have the matching answer handler
        if (this.buttons) {
            for (let i = 0; i < this.buttons.length; i++) {
                const buttonId: string = this.buttons[i].id

                if (!this.handlers[buttonId]) {
                    throw new Error('Node has a button without the matching handler')
                }
            }
        }

        if (this.continueAutomatically) {
            if (!Object.keys(this.handlers).includes('answer') || this.handlers.answer !== null) {
                throw new Error('')
            }
        }

        // Move through all the handlers and check the children nodes
        // Currently seems impossible
    }
}