import {Client} from "./client/client";
import express from "express";
import bodyParser from "body-parser"
import {ConversationHandler} from "./conversation-handler/conversation-handler";
import {Customer} from "./classes/customer";
import {IncomingMessage, MessageType} from "./client/classes/incoming-message";
import {Order, OrderStatus} from "./classes/order/order";
import {getISTDate} from "./utility/date-utility";
import {Courier} from "./classes/courier";
import * as dbInit from './db/db-initialization'
import * as dbOrders from "./db/db-orders";
import * as dbCustomers from "./db/db-customers";
import * as dbCouriers from "./db/db-couriers";
import {adminRoot} from "./conversation-trees/admin-tree/admin-root";
import {rootNode} from "./conversation-trees/order-details-tree/tree-root";
import {presentNumberToCustomer} from "./utility/phone-number-utility";
import {Admin} from "./classes/admin";
import {
    ACTIVE_ORDERS_VAR,
    ORDER_TO_MANAGE
} from "./conversation-trees/courier-dashboard-tree/courier-dashboard-convo-vars";
import {COURIER_VAR} from "./conversation-trees/courier-onboard-new-order-tree/courier-onboarding-convovar-names";
import {
    courierDashboardRoot,
    getNodeForOrderStatusManagement
} from "./conversation-trees/courier-dashboard-tree/courier-dashboard-root";
import {ConvoNode} from "./conversation-handler/classes/convo-node";
import {BASE_LINK} from "./utility/link-to-chat-utility";
import {notifyAdmins} from "./utility/admin-notifs-utility";

const closeBot = process.env.CLOSE_BOT === 'true';

const inProduction: boolean = process.env.MODE === 'prod';
const volumeMountPath: string | undefined = process.env.RAILWAY_VOLUME_MOUNT_PATH;

const phoneNumberId: string | undefined = process.env.NUMBER_ID;
const token: string | undefined = process.env.ACCESS_TOKEN;

if (!phoneNumberId) {
    throw new Error("Missing env var phoneNumberId")
}
if (!token) {
    throw new Error("Missing env var token")
}
if (!volumeMountPath) {
    throw new Error("Missing env var volumeMountPath")
}

const client: Client = new Client(phoneNumberId, token)





const conversationHandlers: ConversationHandler[] = []
const customers: Customer[] = []

const admin1Number: string | undefined = process.env.ADMIN_1

if (!admin1Number) {
    throw new Error("Missing env var Admin1Number");
}

const NITAI_CHAT_LINK: string = BASE_LINK + admin1Number;


const admins: string[] = [admin1Number];

const date = getISTDate()

client.on("initialized", async () => {
    notifyAdmins("אותחלתי בהצלחה בתאריך " + date.toISOString() + " IST");
})

async function handleRequestForOrder(message: string, from: string) {
    let courier: Courier | undefined = await dbCouriers.getCourierByPhone(from)
    if (courier === undefined) {
        const dbId = await dbCouriers.createNewCourier(from)
        courier = new Courier(from, dbId)
    }

    const trackingNumber = message.replace('אשמח לפרטים על משלוח', '').trim()
    const foundOrder: Order | null = paidOrders.find(order => order.getId() === trackingNumber) ||
        await dbOrders.getOrderById(trackingNumber)

    if (!foundOrder) {
        client.sendMessage(`לא נמצאה הזמנה עם מספר מעקב ${trackingNumber}`, from)
    } else if (foundOrder.status !== OrderStatus.Paid) {
        client.sendMessage(`ההזמנה נמכרה כבר, מתנצלים!`, from)
    } else {
        // Add the courier to the queue
        foundOrder.addToQueue(courier);
    }
}


async function handleCaseOfNoConvoHandler(message: IncomingMessage, from: string) {
    // If message is from a courier trying to get a new order
    if (typeof message.body === 'string' && message.body.startsWith('אשמח לפרטים על משלוח ')) {
        handleRequestForOrder(message.body, from);
        return;
    }

    // Check that it's not a message trying to make a new order
    if (message.body !== 'משלוח') {
        // Check if the message is from an admin or if it's an admin simulating a courier
        if (message.body !== 'סימולציית שליח' && admins.indexOf(from) !== -1) {
            const handler: ConversationHandler = new ConversationHandler(adminRoot, new Admin(from), client);
            await handler.startConversation();
            return;
        }


        // Now check if it's a courier that wants to manage their existing orders
        let courier: Courier | undefined = await dbCouriers.getCourierByPhone(from)
        if (courier !== undefined) {
            const activeOrders: Order[] = await courier.getActiveOrders()
            if (activeOrders && activeOrders.length > 0) {
                if (activeOrders.length === 1) {   // If there is only one order
                    const order: Order = activeOrders[0]

                    const statusNode: ConvoNode = getNodeForOrderStatusManagement(order.status)

                    const handler: ConversationHandler = new ConversationHandler(statusNode, courier, client, {
                        [ORDER_TO_MANAGE]: order,
                        [COURIER_VAR]: courier
                    })
                    await handler.startConversation();

                } else {
                    const handler: ConversationHandler = new ConversationHandler(courierDashboardRoot, courier, client, {
                        [ACTIVE_ORDERS_VAR]: activeOrders,
                        [COURIER_VAR]: courier
                    })

                    await handler.startConversation();
                }
            } else {
                client.sendMessage('שלום שליח, אין לך כרגע הזמנות פעילות, שים לב בקבוצות - אני מפרסם כל הזמן הזמנות חדשות. רוצה להזמין הזמנה בעצמך? שלח ״משלוח״', from)
            }


            return;
        }
    }

    if (closeBot) {
        client.sendMessage("היי, סגרנו את הבוט באופן זמני לתיקונים. אנא הזמינו ידנית מיואל: " + NITAI_CHAT_LINK, from);
        return;

    }

    let customer: Customer | null = await dbCustomers.getCustomer(from)

    if (customer === null) {
        dbCustomers.insertCustomer(from)
        // TODO: Get dbId from insertCustoemr and add it to the customer object
        customer = new Customer(from, undefined, undefined)
        console.log("Got a new customer! " + from)
    }

    const handler: ConversationHandler = new ConversationHandler(rootNode, customer, client)
    await handler.startConversation()

    notifyAdmins(`התחלתי שיחה חדשה עם ${presentNumberToCustomer(from)}`)
}


async function handleCaseOfConvoHandler(message: IncomingMessage, from: string, foundConversationHandler: ConversationHandler) {
    if (typeof message.body === 'string' && message.body.startsWith('אשמח לפרטים על משלוח ')) {
        foundConversationHandler.deleteConvo();
        handleRequestForOrder(message.body, from)
    } else if (message.body === 'בטל') {
        foundConversationHandler.deleteConvo();
    } else if (message.body === 'משלוח') {
        foundConversationHandler.deleteConvo();
        let customer: Customer | undefined | null = customers.find(customer => customer.phone === from)

        if (typeof customer === 'undefined') {
            customer = await dbCustomers.getCustomer(from)

            if (customer === null) {
                dbCustomers.insertCustomer(from)
                customer = new Customer(from, undefined, undefined)
                console.log("Got a new customer! " + from)
            }
        }

        const handler: ConversationHandler = new ConversationHandler(rootNode, customer, client)
        await handler.startConversation()

        notifyAdmins(`התחלתי מחדש שיחה עם הלקוח ${presentNumberToCustomer(message.from)}`)
    }
}


async function handleMessageReceivedAndNewTreesUtil(message: IncomingMessage) {


    const from: string = message.from;
    if (admins.indexOf(from) !== -1) {
        if (message.body === 'אתחול יויואיידי') {
            dbInit.startupUUIDExtention();
            return;
        }

        if (message.body === 'אתחול דאטהבייס טייבלס') {
            dbInit.createTables();
            return;
        }

        if (message.body === 'דרופ דרופ דרופ') {
            dbInit.deleteTables();
            return;
        }

        if (typeof message.body === 'string' && message.body.startsWith('ניסוי בינה מלאכותית: ')) {
            const trimmedMessage: string = message.body.replace('ניסוי בינה מלאכותית: ', "");
            const customer = await dbCustomers.getCustomer(message.from);
            if (customer) {
                const aiResp = await openAiClient.generateOrderDetails(trimmedMessage, customer)
                if (aiResp) {
                    const stringResp: string = "הזמנה מסוג: " + aiResp.orderType + "\n\n" + "כתובת איסוף:\n" + aiResp.pickUpAddress?.toString() +
                        "\n\nכתובת מסירה\n" + aiResp.dropOffAddress?.toString() +
                        "\n\nתאריך ושעת איסוף:\n" + (aiResp.pickUpDate ? aiResp.pickUpDate?.getDate() + "." + (aiResp.pickUpDate.getMonth() + 1) : "לא הצלחתי לפענח תאריך איסוף") + "\n" + aiResp.pickUpHour
                        + "\n\nתאריך ושעת מסירה:\n" + (aiResp.dropOffDate ? (aiResp.dropOffDate.getDate() + "." + (aiResp.dropOffDate.getMonth() + 1)) : "לא הצלחתי לפענח תאריך מסירה") + "\n" + aiResp.dropOffHour
                        + "\n\nהערות נוספות:\n" + aiResp.comments

                    client.sendMessage("חולצו פרטי המשלוח: \n" + stringResp, message.from);
                } else {
                    client.sendMessage("לא הצלחתי לייצר פרטי משלוח...", message.from);
                }
            }
            return;
        }
    }

    // Get the convo handler
    const foundConversationHandler = conversationHandlers.find((handler) => {
        return handler.getConvoPartner() === from
    })

    // If there is no convo handler
    if (foundConversationHandler === undefined) {
        return await handleCaseOfNoConvoHandler(message, from)
    } else {
        // If there is a convo handler
        return await handleCaseOfConvoHandler(message, from, foundConversationHandler)
    }
}


client.on('message-received', handleMessageReceivedAndNewTreesUtil)

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies


app.post("/message-received", (req: any, res: any) => {
    // Parse the request body from the POST
    let body = req.body;

    if (req.body.object) {
        if (req.body?.entry[0]?.changes[0]?.value?.messages) {
            const messageData: any = req.body.entry[0].changes[0].value.messages[0]
            let from: string = messageData.from; // extract the phone number from the webhook payload
            let msgType: MessageType = messageData.type // extract the message type
            let msgBody: any = messageData[msgType]; // extract the message text from the webhook payload
            let msgId: any = messageData.id; // extract the message id from the webhook payload
            let contextId = messageData.context?.id // extract the message that this was a reply to (if any)
            if (msgType === 'text') {
                msgBody = msgBody.body
            } else if (msgType === 'interactive') {
                msgBody = msgBody.button_reply || msgBody.list_reply
            }

            let message: IncomingMessage = new IncomingMessage(msgBody, msgId, from, msgType, contextId)

            client.emit("message-received", message);
        }
        res.sendStatus(200);
    } else {
        // Return a '404 Not Found' if event is not from a WhatsApp API
        res.sendStatus(404);
    }
});


app.get("/message-received", (req, res) => {
    const verify_token = process.env.VERIFY_TOKEN;

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token == verify_token) {
            // Respond with 200 OK and challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});


app.listen(process.env.PORT || 1337, () => {
    console.log(`Delivery bot webhook listening on port ${process.env.PORT}`)
    client.emit('initialized', {})
})







// Graceful Shutdown
process.on('SIGTERM', beforeShutdown);
process.on('SIGINT', beforeShutdown);


function beforeShutdown() {
    console.log("Received kill signal, shutting down gracefully");
    notifyAdmins("☠️☠️☠️בתהליך קריסה/ביצוע אתחול☠️☠️☠️");

    const unadvertisedOrdersStr: string = unadvertisedOrders.map(order => 'הזמנה מס׳ ' + order.getId() + "\n" + ' עם ההודעה הבאה:\n ' + order.generateAdvertMessage() + " \n לתאריך " + order.getDropoffDate().toISOString()).join('\n\n');
    if (unadvertisedOrders.length > 0) {
        notifyAdmins(unadvertisedOrdersStr);
    }
}

export {
}


