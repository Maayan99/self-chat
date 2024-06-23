import {User} from "../classes/user";
import {Client, IndexedListener} from "../client/client";
import {AnswerHandler, ConvoNode} from "./classes/convo-node"
import {ConvoVars} from "./classes/convo-vars";
import {IncomingMessage} from "../client/classes/incoming-message";
import {conversationHandlers, meshulamClient, YOEL_CHAT_LINK} from "../main";
import {OutboundMessage} from "../client/classes/outbound-message";
import {Address} from "../classes/address";
import {getCustomersAddress} from "../db/db-addresses";
import {
    ADDRESS_OBJECT_VAR,
    ADDRESS_VAR,
    CUSTOMER_VAR,
    FROM_VAR,
    ORDER_VAR,
    ORIGIN_ADDRESS_CONTACT_VAR
} from '../conversation-trees/order-details-tree/convo-var-names'
import {Order} from "../classes/order/order";
import {OrderFactory} from "../classes/order/order-factory";
import {formatPhoneNumber, presentNumberToCustomer} from "../utility/phone-number-utility";
import {ChatPartner} from "../classes/chat-partner";
import {notifyAdminsError} from "../utility/admin-notifs-utility";


const OPEN: string = "open"
const BUTTONS: string = "buttons"
const LIST: string = "list"
const MINUTES_OF_INACTIVITY: number = 60

export type AddOrder = ConversationHandler['addOrder']


/**
 * Represents a handler for managing a conversation with a chatPartner.
 * This class handles the flow of the conversation, handles user inputs, and manages the conversation state.
 */
export class ConversationHandler {
    private readonly originNode: ConvoNode
    private curNode: ConvoNode
    private chatPartner: ChatPartner
    private readonly to: string
    private client: Client
    private readonly convoVars: ConvoVars
    private currentMessage: string | undefined;
    private inactivityTimeoutFuncId: NodeJS.Timeout | undefined;
    private currentListener: IndexedListener | undefined;

    private orders: Order[] = []

    /**
     * Creates a new ConversationHandler instance.
     * @param originNode The initial node of the conversation tree.
     * @param chatPartner The chatPartner object associated with this conversation.
     * @param client The Client instance used for sending and receiving messages.
     * @param startingConvoVars some starting vars for the conversation
     */
    constructor(originNode: ConvoNode, chatPartner: ChatPartner, client: Client, startingConvoVars?: {
        [key: string]: any
    }) {
        this.originNode = originNode
        this.curNode = originNode
        this.chatPartner = chatPartner
        this.to = chatPartner.phone
        this.client = client
        this.convoVars = new ConvoVars()
        this.convoVars.append(FROM_VAR, this.to)
        this.convoVars.append(ORIGIN_ADDRESS_CONTACT_VAR, this.to)
        this.convoVars.append(CUSTOMER_VAR, chatPartner)

        if (startingConvoVars) {
            for (const key in startingConvoVars) {
                this.convoVars.append(key, startingConvoVars[key])
            }
        }


        conversationHandlers.push(this)

        console.log("Created a new convo handler! ")
        console.log("New amount of conversations: " + conversationHandlers.length)
    }

    /**
     * Starts the conversation by handling the origin node.
     */
    async startConversation() {
        if (this.chatPartner instanceof User) {
            // Get customer's address
            const address: Address | null = await getCustomersAddress(this.to)
            this.convoVars.append(ADDRESS_VAR, address?.formattedAddress)
            this.convoVars.append(ADDRESS_OBJECT_VAR, address)
        }
        this.handleNode(this.originNode)
    }

    /**
     * Returns the convo handler's to field (the chatPartner with which the convo is being had)
     */
    getConvoPartner(): string {
        return this.to
    }


    /**
     * Moves the convo to the specified node and handles it.
     * @param node The node to handle
     * */
    async handleNode(node: ConvoNode): Promise<void> {
        try {
            this.curNode = node;

            const nodeMessage: string | OutboundMessage = this.curNode.generateMessage(this.convoVars.read.bind(this.convoVars))
            this.currentMessage = await this.client.sendMessage(nodeMessage, this.to)

            clearTimeout(this.inactivityTimeoutFuncId);

            if (node.continueAutomatically) {
                this.handleAutomaticContinue()
            } else {
                this.currentListener = this.client.on('message-received', this.handleTriggerMessage.bind(this), true, this.to)
                this.inactivityTimeoutFuncId = setTimeout(this.deleteConvo.bind(this), MINUTES_OF_INACTIVITY * 60 * 1000)
            }
        } catch (e) {
            console.error(e)
            notifyAdminsError('נכשלתי במהלך השיחה עם מספר ' + presentNumberToCustomer(this.to) + ' בהודעת שגיאה:\n' + e)
        }
    }

    /**
     * Deletes the current conversation handler.
     * @param noListener Optional parameter to indicate if the listener should be removed or not.
     */
    deleteConvo(noListener?: boolean) {
        if (!noListener) {
            this.client.off('message-received', this.currentListener?.id || -1)
        }

        // Delete this convo handler
        conversationHandlers.splice(conversationHandlers.indexOf(this), 1)

        this.deleteOrders()

        console.error("Deleting conversation! ")
        console.log("Conversations left standing: " + conversationHandlers.length)
    }

    /**
     * Handles the execution of an answer handler.
     * @param handler The answer handler to be executed.
     * @param message Optional message object associated with the handler.
     */
    private async useHandler(handler: AnswerHandler, message?: IncomingMessage) {
        if (typeof (handler) === 'function') {
            // Check if the handler has 3 or 4 parameters (message, read, append, addOrder?) and execute accordingly
            if (handler.length === 3) {
                // @ts-ignore
                const handlerResult: ConvoNode | null = await handler(message, this.convoVars.read.bind(this.convoVars), this.convoVars.append.bind(this.convoVars))
                if (handlerResult !== null) {
                    this.curNode = handlerResult;
                } else {
                    this.deleteConvo(true)
                    clearTimeout(this.inactivityTimeoutFuncId)
                    return;
                }
            } else {
                const handlerResult: ConvoNode | null = await handler(message, this.convoVars.read.bind(this.convoVars), this.convoVars.append.bind(this.convoVars), this.addOrder.bind(this))
                if (handlerResult !== null) {
                    this.curNode = handlerResult;
                } else {
                    this.deleteConvo(true)
                    clearTimeout(this.inactivityTimeoutFuncId)
                    return;
                }
            }

            this.handleNode(this.curNode)
        } else if (handler === null) {
            this.deleteConvo(true)
            clearTimeout(this.inactivityTimeoutFuncId)
        } else {
            this.curNode = handler
            this.handleNode(this.curNode)
        }
    }


    /**
     * Handles the automatic continuation of the conversation.
     */
    private async handleAutomaticContinue() {
        console.error("Continuing automatically")
        const handler: AnswerHandler = this.curNode.handlers.answer;

        await this.useHandler(handler)
    }


    /**
     * Handles the trigger message received from the chatPartner. Will be passed as listener func
     * @param triggerMessage The message object received from the chatPartner.
     */
    async handleTriggerMessage(triggerMessage: IncomingMessage) {
        // Check if the message is from the user associated with this conversation handler
        if (triggerMessage.from !== this.to) {
            return;
        }

        // Handle special cases ("cancel" or "new")
        if (triggerMessage.body === 'בטל' || triggerMessage.body === 'משלוח') {
            return;
        }

        // Check if the message is not a reply to the current message or if the message type doesn't match the current node type
        if ((triggerMessage.contextId && this.currentMessage !== triggerMessage.contextId) ||
            (triggerMessage.type === "text" && this.curNode.type !== OPEN) ||
            (triggerMessage.type === "interactive" &&
                (this.curNode.type !== BUTTONS && this.curNode.type !== LIST))) {
            this.client.on('message-received', this.handleTriggerMessage.bind(this), true, this.to)
            return;
        }

        let handler: AnswerHandler

        switch (triggerMessage.type) {
            case 'text':
                handler = this.curNode.handlers["answer"];
                break;
            case 'interactive':
                // Handle interactive message type

                // Check if the message body has the required properties
                if (typeof triggerMessage.body === 'string' || !('id' in triggerMessage.body && 'title' in triggerMessage.body)) {
                    throw new Error("Bad message data");
                }

                if ('answer' in this.curNode.handlers) {
                    // If we have one handler for all cases, get it from the answer field
                    handler = this.curNode.handlers.answer;
                } else {
                    // Else, look it up using id
                    const lookupHandler: AnswerHandler | undefined | null = this.curNode.handlers[triggerMessage.body.id]
                    if (typeof lookupHandler === 'undefined') {
                        throw new Error("Received a buttons quick reply but couldn't find a fitting handler!")
                    }

                    handler = lookupHandler
                }
                break;
            case 'location':
                handler = this.curNode.handlers["answer"]
                break;
            default:
                console.log("Defaulting to null handler")
                handler = null
        }

        await this.useHandler(handler, triggerMessage)
    }

    addOrder() {
        let order;
        try {
             order = OrderFactory.createFromConvo(this.convoVars.read.bind(this.convoVars))
        } catch (e) {
            notifyAdminsError("נכשלתי במהלך יצירת אובייקט הזמנה ללקוח " + formatPhoneNumber(this.chatPartner.phone) + ".\n\n התקבלה שגיאה:\n" + e);
            this.client.sendMessage("נכשלתי במהלך יצירת ההזמנה, אנא נסו שוב או צרו קשר עם יואל להזמנה ידנית בלינק הבא: " + YOEL_CHAT_LINK, this.chatPartner.phone);
            this.deleteConvo();
            return false;
        }
        this.convoVars.append(ORDER_VAR, order)
        this.orders.push(order)
        return true;
    }

    deleteOrders() {
        for (const order of this.orders) {
         //   unpaidOrders.splice(unpaidOrders.indexOf(order), 1)
            meshulamClient.terminateOrderProcesses(order);
        }
    }
}