import {Address} from "../address";
import {Customer} from "../customer";
import {Courier} from "../courier";
import {formatDateWithoutYear} from "../../utility/date-utility";


export class CompletedOrder {
    private id: string;
    private pickUpAddress: Address;
    private dropOffAddress: Address;
    private commentsForCourier: string
    private interCity: boolean
    public customer: Customer;
    public courier: Courier;
    public priceForCustomer: number;
    public priceForCourier: number;
    private lastComments: string;
    private receivedIn: Date;
    private deliveredIn: Date;



    constructor(
        id: string,
        lastComments: string,
        priceForCustomer: number,
        priceForCourier: number,
        customer: Customer,
        courier: Courier,
        pickUpAddress: Address,
        dropOffAddress: Address,
        interCity: boolean,
        receivedIn: Date,
        deliveredIn: Date,
        commentsForCourier: string,
    ) {
        this.id = id;
        this.lastComments = lastComments;
        this.priceForCustomer = priceForCustomer;
        this.priceForCourier = priceForCourier;
        this.customer = customer;
        this.courier = courier;
        this.pickUpAddress = pickUpAddress;
        this.dropOffAddress = dropOffAddress;
        this.interCity = interCity;
        this.receivedIn = receivedIn;
        this.deliveredIn = deliveredIn;
        this.commentsForCourier = commentsForCourier;
    }

    getId(): string {
        return this.id
    }

    getDeliveredIn(): Date {
        return this.deliveredIn
    }

    getPriceForCustomer(): number {
        return this.priceForCustomer
    }


    getPriceForCourier(): number {
        return this.priceForCourier
    }

    toString(): string {
        return 'הזמנה מס׳ ' + this.id + ' במחיר ' + this.priceForCustomer + '₪ שנמכרה עבור ' + this.priceForCourier
            + '₪ עם רווח של ' + (this.priceForCustomer - this.priceForCourier) +
            '₪ מ' + this.pickUpAddress.toString() + ' ל' + this.dropOffAddress.toString() +
            ' שנמסרה בתאריך ' + formatDateWithoutYear(this.deliveredIn) + ' עם ההערות ״' + this.lastComments + '״'
    }

    toExcelRow(): string[] {
        return [
            this.id,
            this.priceForCustomer + '₪',
            this.priceForCourier + '₪',
            (this.priceForCustomer - this.priceForCourier) + '₪',
            Math.round(((this.priceForCustomer - this.priceForCourier)/this.priceForCustomer)*100) + '%',
            this.customer.phone,
            this.pickUpAddress.toString(),
            this.dropOffAddress.toString(),
            formatDateWithoutYear(this.deliveredIn),
            this.lastComments
        ]
    }

    public toWaString(): string {
        return `*${this.id}:* `
            + `מ${this.pickUpAddress} `
            + `ל${this.dropOffAddress} `
            + `מתאריך ${formatDateWithoutYear(this.deliveredIn)}`
    }

    // public async generateCompletedOrderObject(): Promise<CompletedDbOrder> {
    //     return {
    //         id: this.id,
    //         last_comments: 'חוויה מצוינת',
    //         price_for_customer: this.priceForCustomer,
    //         price_for_courier: this.priceForCourier,
    //         customer: await this.customer.getDbId(),
    //         courier: await this.courier.getDbId(),
    //         pickup_address: await this.pickUpAddress.getDbId(),
    //         dropoff_address: await this.dropOffAddress.getDbId(),
    //         is_intercity: this.interCity,
    //         order_received_in: formatDateForDb(this.receivedIn),
    //         delivered_in: formatDateForDb(getISTDate()), // Not used when inserting order
    //         comments: this.commentsForCourier,
    //     }
    // }
}
