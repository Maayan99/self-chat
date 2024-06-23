import {customers} from "../main";
import * as dbCustomers from "../db/db-customers"
import * as dbAddresses from "../db/db-addresses"
import {Address} from "./address";
import {ChatPartner} from "./chat-partner";
import {presentNumberToCustomer} from "../utility/phone-number-utility";
import {CompletedOrder} from "./order/completed-order";
import {getAllCompletedOrdersOfCustomer} from "../db/db-completed-orders";
import {AddressInDb} from "../db/db-addresses";

export class Customer implements ChatPartner {
    phone: string;
    addressId: string | undefined
    address: Address | undefined
    name: string | undefined
    dbId: string | undefined
    returningCustomer?: boolean
    lastUsedAddresses?: Address[] | null

    constructor(phone: string, addressId?: string, dbId?: string, lastUsedAddresses?: Address[] | null, returningCustomer?: boolean, name?: string) {
        this.phone = phone
        this.addressId = addressId
        this.dbId = dbId
        this.lastUsedAddresses = lastUsedAddresses
        this.returningCustomer = returningCustomer
        this.name = name;
        customers.push(this)
    }

    async getDbId(): Promise<string> {
        if (this.dbId) {
            return this.dbId
        } else {
            const customerInDb: Customer | null = await dbCustomers.getCustomer(this.phone);
            this.dbId = customerInDb?.dbId

            if (typeof this.dbId === "undefined") {
                throw new Error('Trying to update address for customer not in db')
                // TODO: error handling
            }

            return this.dbId
        }
    }

    async getName(): Promise<string | undefined> {
        if (!this.name) {
            const customerInDb: Customer | null = await dbCustomers.getCustomer(this.phone);
            this.name = customerInDb?.name
        }
        return this.name
    }

    async getLastUsedAddresses(): Promise<Address[] | null> {
        if (!this.lastUsedAddresses) {
            this.lastUsedAddresses = await dbAddresses.getLastUsedAddresses(this)
        }
        return this.lastUsedAddresses
    }

    pushToLastUsedAddresses(address: Address): void {
        if (!this.lastUsedAddresses) {
            this.lastUsedAddresses = [address];
        } else {
            this.lastUsedAddresses.push(address);
        }
    }

    async getAddress(): Promise<Address | undefined> {
        if (!this.addressId) {
            return undefined;
        }
        if (!this.address) {
            this.address = await dbAddresses.getAddressById(this.addressId);
        }
        return this.address;
    }

    getIfReturningCustomer(): boolean {
        // Returns true if customer is returning customer, false if not or undefined
        return this.returningCustomer === true
    }

    public async toString(): Promise<string> {
        let address: Address | undefined;
        if (this.addressId) {
            address = await dbAddresses.getAddressById(this.addressId);
        }

        let stringRepresentation =  'טלפון: _' + presentNumberToCustomer(this.phone) + "_"

        return address ? stringRepresentation + '\nכתובת: _' + address.formattedAddress + '_' : stringRepresentation
    }

    public async toExcelRow(): Promise<string[]> {
        let address: Address | undefined;
        if (this.addressId) {
            address = await dbAddresses.getAddressById(this.addressId);
        }

        const completedOrders: CompletedOrder[] = await getAllCompletedOrdersOfCustomer(this);
        const numberOfOrders: number = completedOrders.length;
        const totalMoneySpent: number = completedOrders.reduce(
            (total: number, order: CompletedOrder) => total + order.priceForCustomer, 0)
        const totalProfitMade: number = completedOrders.reduce(
            (total: number, order: CompletedOrder) => total + order.priceForCustomer - order.priceForCourier, 0)

        let row: string[] = [];
        row.push(this.name || "אין");
        row.push(this.phone);
        row.push(address?.formattedAddress || "");
        row.push(`${numberOfOrders}`);
        row.push(`${totalMoneySpent}₪`);
        row.push(`${totalProfitMade}₪`);
        row.push(`${totalMoneySpent ? Math.round((totalProfitMade/totalMoneySpent) * 100) : 0}%`)
        return row;
    }
}