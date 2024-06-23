import {Courier} from "./courier";
import {client} from "../main";

// A message sent to other couriers when the order is sold, indicating that it's no longer available
const SOLD_MESSAGE = 'נ'

export class CourierQueueManager {
    private queue: Courier[];

    constructor() {
        this.queue = []
    }

    add(courier: Courier): void {
        this.queue.push(courier)
    }

    shift(): Courier | undefined {
        if (!this.isEmpty()) {
            this.queue.shift()
            return this.getNextInQueue()
        }
    }

    getNextInQueue(): Courier | undefined {
        if (!this.isEmpty()) {
            return this.queue[0]
        }
    }

    isEmpty(): boolean {
        return this.queue.length === 0
    }


    notifyOtherCouriersThatOrderWasSold(courier: Courier): void {
        const otherCouriers: string[] = this.queue.map(courier => courier.phone)
        console.log("Courier phone: ")
        console.log(otherCouriers)
        for (let i = 0; i < otherCouriers.length; i++) {
            const courierPhone = otherCouriers[i];
            console.log("Checking phone: ", courierPhone)
            if (courierPhone !== courier.phone) { // If it's not the courier that agreed to take the order
                console.error("Notifying phone: ", courierPhone)
                client.sendMessage(SOLD_MESSAGE, courierPhone)
            }
        }
    }
}