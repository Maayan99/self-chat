import axios, {AxiosError} from "axios";
import {OutboundMessage} from "./classes/outbound-message";
import {TextMessage} from "./classes/text-message";
import * as fs from "fs";
import FormData from 'form-data'
import {volumeMountPath} from "../main";
import {response} from "express";
import * as console from "console";


const EXCEL_FILE_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EXCEL_WA_TYPE = 'document';

type Listener = (data: any) => void;
export type IndexedListener = { 'id': number, 'listener': Listener, 'acceptFrom'?: string }

/**
 * Represents a client for interacting with the WhatsApp API.
 */
export class Client {
    private readonly phoneId: string
    private readonly accessToken: string
    private readonly apiUrl: string
    private readonly mediaUrl: string;
    private readonly events: { [key: string]: IndexedListener[] } = {};
    private listenerIdCounter: number = 0;

    /**
     * Creates a new Client instance.
     * @param phoneId - The ID of the phone number associated with the WhatsApp account.
     * @param accessToken - The access token for authenticating with the WhatsApp API.
     */
    constructor(phoneId: string, accessToken: string) {
        this.phoneId = phoneId
        this.accessToken = accessToken
        this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneId}/messages`
        this.mediaUrl = `https://graph.facebook.com/v19.0/${this.phoneId}/media`
        this.events = {}
    }

    wrapListener(listener: Listener, removeCallback: (event: string, id: number) => void, event: string, id: number): Listener {
        return (...args) => {
            listener(...args);
            removeCallback.bind(this)(event, id);
        };
    }

    /**
     * Registers a listener for a specific event.
     * @param event - The name of the event to listen to.
     * @param listener - The callback function to be invoked when the event occurs.
     * @param selfDestruct - Whether the listener should automatically remove itself after being invoked.
     * @param acceptFrom - Optional. If provided, the listener will only be invoked for events with the specified `from` value.
     * @returns An IndexedListener object representing the registered listener.
     */
    on(event: string, listener: Listener, selfDestruct?: boolean, acceptFrom?: string): IndexedListener {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        const listenerId: number = this.listenerIdCounter++;
        let listenerObject: IndexedListener;
        if (selfDestruct) {
            const wrappedListener: Listener = this.wrapListener(listener, this.off, event, listenerId);

            listenerObject = acceptFrom ?
                {id: listenerId, listener: wrappedListener.bind(this), acceptFrom: acceptFrom} :
                {id: listenerId, listener: wrappedListener.bind(this)}
        } else {
            listenerObject = acceptFrom ?
                {id: listenerId, listener: listener, acceptFrom: acceptFrom} :
                {id: listenerId, listener: listener}
        }

        this.events[event].push(listenerObject);

        //console.log(`Added an event of type ${event}. There are now this many listeners for this event: ${this.events[event].length}`)

        return listenerObject;
    }

    /**
     * Removes a listener for a specific event.
     * @param event - The name of the event for which the listener should be removed.
     * @param id - The ID of the listener to be removed.
     */
    off(event: string, id: number): void {
        //console.log("Trying to remove event listener. Amount before removal: " + this.events[event].length)
        const listeners: IndexedListener[] = this.events[event];
        if (listeners) {
            const listenerToRemove = listeners.find((listener_) => {
                return listener_.id === id
            });
            if (listenerToRemove) {
                const index: number = listeners.indexOf(listenerToRemove)
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }
        }

        //console.log("There are now this many listeners of this type: " + this.events[event].length)
    }

    /**
     * Emits all events with the provided data.
     * @param event - The name of the event to emit.
     * @param data - The data to be passed to the event listeners.
     */
    emit(event: string, data: any): void {
        const listeners = this.events[event];
        if (listeners) {
            listeners.forEach(listener => {
                if (data.from && listener.acceptFrom && data.from !== listener.acceptFrom) return;
                listener.listener(data)
            });
        }
    }

    /**
     * Sends a message through the WhatsApp API.
     * @param message - The message to be sent, either a string or an OutboundMessage object.
     * @param id - The ID of the recipient to which the message should be sent.
     * @param reply - Optional. If provided, the message will be sent as a reply to the specified message.
     * @returns A Promise that resolves with the API response data on success, or false on failure.
     */
    async sendMessage(message: OutboundMessage | string, id: string, reply?: string): Promise<any> {
        if (typeof message === 'string') {
            message = new TextMessage(message)
        }

        const messageApiType: string = message.getApiType()

        const messageBody: any =
            {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": id,
                "type": messageApiType,
                [messageApiType]: message.transformToApiRepresentation()
            }

        if (reply) {
            messageBody.context = reply
        }

        const headers =
            {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }

        let resp: any;
        try {
            resp = await axios.post(this.apiUrl, messageBody, {headers: headers})
            const messages: any = resp?.data?.messages;
            if (messages) {
                return messages[0].id
            }
        } catch (e: any) {
            console.log(e.response.data)
        }

        // Didn't return id - must have had a problem. Return false
        return false
    }


    public async uploadMedia(filename: string, mediaType: string) {
        try {
            const filepath: string = volumeMountPath + '/' + filename

            fs.stat(filepath, (err, stats) => {
                if (err) {
                    console.log(err);
                }

                console.log("File size read: ", stats.size);
            })

            const data = new FormData();
            data.append("file", fs.createReadStream(filepath), {
                contentType: mediaType,
            });
            //data.append('type', mediaType);
            data.append('messaging_product', 'whatsapp');

            const headers =
                {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'multipart/form-data',
                    ...data.getHeaders(),
                }


            const response = await axios({
                method: 'post',
                maxBodyLength: Infinity,
                url: this.mediaUrl,
                timeout: 120000, // One minute
                data: data,
                headers: headers
            });
            const id: string = response.data.id;

            console.log("API Response:", response.data);

            return id;
        } catch (error: any) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log("Response error type");
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser
                // and an instance of http.ClientRequest in node.js
                console.log("Request error type");
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log("Other error type");
                console.log('Error', error.message);
            }
        }
    }

    public async sendMedia(caption: string, filename: string, waType: string, mediaType: string, id: string) {
        const fileId: string | undefined = await this.uploadMedia(filename, mediaType)

        console.log("File id: ", fileId)
        if (!fileId) {
            console.log("Not performing the fucking request now");
            return false;
        }
        const messageBody: any =
            {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": id,
                "type": waType,
                [waType]: {
                    id: fileId,
                    //filename: filename, // Moved ahead such that it won't be added for images
                    caption: caption
                }
            };

        if (waType !== "image") {
            messageBody[waType].filename = filename;
        }

        const headers =
            {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }

        let resp: any;
        try {
            resp = await axios.post(this.apiUrl, messageBody, {headers: headers})
            const messages: any = resp?.data?.messages;
            if (messages) {
                return messages[0].id
            }
        } catch (error: any) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser
                // and an instance of http.ClientRequest in node.js
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
            }
        }

        // Didn't return id - must have had a problem. Return false
        return false
    }

    public async sendExcelFile(caption: string, filename: string, id: string) {

        await this.sendMedia(
            caption,
            filename,
            EXCEL_WA_TYPE,
            EXCEL_FILE_MEDIA_TYPE,
            id
        )
    }
}