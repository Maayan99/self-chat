import {ChatPartner} from "./chat-partner";
import {Order} from "./order/order";
import * as dbCouriers from "../db/db-couriers";
import {couriers} from "../main";
import {presentNumberToCustomer} from "../utility/phone-number-utility";

export class Courier implements ChatPartner {
    dbId: string | undefined;
    phone: string;
    activeOrders: Order[] = [];


    constructor(phone: string, dbId?: string) {
        this.dbId = dbId;
        this.phone = phone;
        couriers.push(this);
    }

    async getActiveOrders(): Promise <Order[]> {
        if (this.activeOrders.length > 0) {
            return this.activeOrders
        } else {
            this.activeOrders = await dbCouriers.getCourierActiveOrders(this) || [];
            return this.activeOrders
        }
    }

    async getDbId(): Promise<string> {
        if (!this.dbId) {
            const courierByPhone = await dbCouriers.getCourierByPhone(this.phone);
            const dbId = courierByPhone?.dbId;
            if (!dbId) {
                throw new Error('Trying to get dbId for courier not in db')
            }
            this.dbId = dbId;
        }
        return this.dbId;
    }

    async addActiveOrder(order: Order) {
        if (!await this.getActiveOrders()) {
            this.activeOrders = [order]
        } else {
            this.activeOrders.push(order)
        }
        await dbCouriers.addActiveOrderToCourierDb(this, order);
        return;
    }

    async setActiveOrderAsCompleted(order: Order) {
        // Remove it from the object's active orders
        this.activeOrders = this.activeOrders.filter(activeOrder => activeOrder.getId() !== order.getId());

        // Update db
        await dbCouriers.setActiveOrderAsCompletedForCourier(this, order);
    }

    public async toString(): Promise<string> {
        if ((await this.getActiveOrders()).length > 0) {
            return 'שליח ' + presentNumberToCustomer(this.phone) + ' שכרגע משמש שליח עבור ההזמנות:\n' +
                this.activeOrders.map(order => order.getId() + ', ' + order.toString()).join('\n')
        }
        return 'שליח ' + presentNumberToCustomer(this.phone) + ' ללא הזמנות פעילות'
    }

    public async toExcelRow(): Promise<string[]> {
        return [presentNumberToCustomer(this.phone)]
    }
}