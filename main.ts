import {Client} from "./client/client";
import express from "express";
import bodyParser from "body-parser"
import {ConversationHandler} from "./conversation-handler/conversation-handler";
import {User} from "./classes/user";
import {IncomingMessage, MessageType} from "./client/classes/incoming-message";
import {getISTDate} from "./utils/date-utility";
import {notifyAdmins} from "./utils/admin-notifs-utility";
import {MessageHandler} from "./message-handler/message-handler";

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
const customers: User[] = []

const admin1Number: string | undefined = process.env.ADMIN_1

if (!admin1Number) {
    throw new Error("Missing env var Admin1Number");
}

const NITAI_CHAT_LINK: string = BASE_LINK + admin1Number;


const admins: string[] = [admin1Number];

const date = getISTDate()

client.on("initialized", async () => {
    notifyAdmins("אותחלתי בהצלחה בתאריך " + date.toISOString() + " IST");
});


const messageHandler = new MessageHandler();

client.on('message-received', (message) => messageHandler.handleReceivedMessage(message));

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
}

export {
    client,
    admins
}


