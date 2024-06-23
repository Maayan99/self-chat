import {VarRead} from "../../conversation-handler/classes/convo-vars";
import {
    ADDRESS_OBJECT_VAR,
    BUSINESS_OPEN_TILL,
    COMMENTS_FOR_COURIER_VAR,
    CUSTOMER_VAR,
    DROPOFF_DATE_VAR,
    FROM_BUSINESS_VAR,
    FROM_VAR,
    MIDNIGHT_OPEN_TILL_VAR,
    NON_BUSINESS_ORDER_VAR,
    ORIGIN_ADDRESS_CONTACT_VAR,
    OTHER_ADDRESS_CONTACT_VAR,
    OTHER_ADDRESS_OBJECT_VAR,
    OTHER_ADDRESS_OPEN_TILL_VAR,
    PACKAGE_SIZE_VAR,
    PICKUP_DATE_VAR,
    READY_FOR_PICKUP_VAR,
    SAME_CITY_VAR,
    TRUE_STR
} from "../../conversation-trees/order-details-tree/convo-var-names";
import {Order, PackageSize} from "./order";
import {Address} from "../address";
import {Customer} from "../customer";
import {ToBusinessOrder} from "./to-business-order";
import {FromBusinessOrder} from "./from-business-order";
import {FIELD_DICTIONARY} from "./dicts-and-utility-for-orders";
import {OrderInDb} from "../../db/db-orders";
import {createAddressAndUpdateCustomer, getAddressById} from "../../db/db-addresses";
import {getCustomerById} from "../../db/db-customers";
import {parseHour, presentHourToCustomer} from "../../utility/hour-utility";
import {Courier} from "../courier";
import {getCourierById} from "../../db/db-couriers";
import {CompletedDbOrder} from "../../db/db-completed-orders";
import {CompletedOrder} from "./completed-order";
import {notifyAdminsError} from "../../utility/admin-notifs-utility";
import {formatPhoneNumber} from "../../utility/phone-number-utility";
import {DeliveryDate} from "../../utility/classes/delivery-date";

const PACKAGE_SIZE_STR_SMALL = 'משלוח קטן (אופנוע)';
const PACKAGE_SIZE_STR_BIG = 'משלוח גדול (רכב פרייבט)';
const PACKAGE_SIZE_STR_LARGE = 'משלוח ענק (רכב מסחרי)';
const packageSizeStringToEnum = (string: string): PackageSize => {
    switch (string) {
        case PACKAGE_SIZE_STR_SMALL:
            return PackageSize.Small;
        case PACKAGE_SIZE_STR_BIG:
            return PackageSize.Big;
        case PACKAGE_SIZE_STR_LARGE:
            return PackageSize.Large;
        default:
            throw new Error("Trying to convert string to PackageSize enum but the string is " + string + " and does not describe a valid package size.");
    }
}


export class OrderFactory {
    /**
     * Creates an Order object from conversation data.
     *
     * @param {VarRead} read - The function used to read conversation variables.
     * @returns {Order} - The created Order object.
     */
    static createFromConvo(read: VarRead): Order {
        try {
            const customer: Customer = read(CUSTOMER_VAR)
            let packageSize: PackageSize
            packageSize = packageSizeStringToEnum(read(PACKAGE_SIZE_VAR));

            let pickUpAddress: Address = read(ADDRESS_OBJECT_VAR)
            let pickUpContact: string = read(ORIGIN_ADDRESS_CONTACT_VAR)
            let dropOffAddress: Address = read(OTHER_ADDRESS_OBJECT_VAR)
            let dropOffContact: string = read(OTHER_ADDRESS_CONTACT_VAR)
            const readyForPickup: boolean = read(READY_FOR_PICKUP_VAR) === TRUE_STR
            const pickUpDate: DeliveryDate = read(PICKUP_DATE_VAR)
            const dropOffDate: DeliveryDate = read(DROPOFF_DATE_VAR)
            const commentsForCourier: string = read(COMMENTS_FOR_COURIER_VAR)
            const interCity: boolean = (read(SAME_CITY_VAR) !== TRUE_STR)


            if (read(NON_BUSINESS_ORDER_VAR) === TRUE_STR) {
                // Add the addresses to the db, so we can refer to them later
                createAddressAndUpdateCustomer(customer, pickUpAddress)
                createAddressAndUpdateCustomer(customer, dropOffAddress)

                return new Order(FIELD_DICTIONARY, packageSize, pickUpAddress, pickUpContact, dropOffAddress, dropOffContact, readyForPickup, pickUpDate, dropOffDate, commentsForCourier, interCity, customer)
            } else if (read(FROM_BUSINESS_VAR) === TRUE_STR) {
                const pickUpAddressOpenTill = read(BUSINESS_OPEN_TILL)
                const dropOffAddressOpenTill = read(OTHER_ADDRESS_OPEN_TILL_VAR)

                return new FromBusinessOrder(packageSize, pickUpAddress, pickUpContact, dropOffAddress, dropOffContact, readyForPickup, pickUpDate, dropOffDate, commentsForCourier, interCity, customer, pickUpAddressOpenTill, dropOffAddressOpenTill)
            } else {
                pickUpAddress = read(OTHER_ADDRESS_OBJECT_VAR)
                pickUpContact = read(OTHER_ADDRESS_CONTACT_VAR)
                dropOffAddress = read(ADDRESS_OBJECT_VAR)
                dropOffContact = read(ORIGIN_ADDRESS_CONTACT_VAR)

                const pickUpAddressOpenTill = read(OTHER_ADDRESS_OPEN_TILL_VAR)
                const dropOffAddressOpenTill = read(BUSINESS_OPEN_TILL)

                return new ToBusinessOrder(packageSize, pickUpAddress, pickUpContact, dropOffAddress, dropOffContact, readyForPickup, pickUpDate, dropOffDate, commentsForCourier, interCity, customer, pickUpAddressOpenTill, dropOffAddressOpenTill)
            }
        } catch (e) {
            notifyAdminsError("נכשלתי במהלך יצירת אובייקט הזמנה משיחה עם לקוח בטלפון: " + formatPhoneNumber(read(FROM_VAR)));
            throw new Error(`${e}`);
        }
    }


    /**
     * Create an Order instance from a database order object.
     *
     * @param {OrderInDb} orderInDb - The order object retrieved from the database.
     * @returns {Promise<Order>} - A Promise that resolves to the created Order instance.
     * @throws {Error} - Throws an error if customer, pickup address, dropoff address or contact for the order are not found.
     */
    static async createFromDb(orderInDb: OrderInDb): Promise<Order> {
        const pickUpAddress: Address | undefined = await getAddressById(orderInDb.pickup_address)
        const dropOffAddress: Address | undefined = await getAddressById(orderInDb.dropoff_address)
        const customer: Customer | null = await getCustomerById(orderInDb.customer)

        let courier: Courier | undefined;
        if (orderInDb.courier) {
            courier = await getCourierById(orderInDb.courier);
        }

        if (!customer) {
            throw new Error("Customer for order not found!")
        }

        if (!pickUpAddress || !dropOffAddress) {
            throw new Error("Address for order not found!")
        }

        if (!pickUpAddress.contact || !dropOffAddress.contact) {
            throw new Error("Contact for order not found!")
        }

        const pickUpDate: DeliveryDate = new DeliveryDate({ dbRepresentation: orderInDb.pickup_date });
        const dropOffDate: DeliveryDate = new DeliveryDate({ dbRepresentation: orderInDb.dropoff_date });


        const readyForPickup: boolean = pickUpDate.customerFormatHour() === MIDNIGHT_OPEN_TILL_VAR

        if (pickUpAddress.openTill !== MIDNIGHT_OPEN_TILL_VAR || dropOffAddress.openTill !== MIDNIGHT_OPEN_TILL_VAR) {


            return new ToBusinessOrder(orderInDb.package_size, pickUpAddress, pickUpAddress.contact, dropOffAddress,
                dropOffAddress.contact, readyForPickup, pickUpDate,
                dropOffDate, orderInDb.comments, orderInDb.is_intercity, customer,
                presentHourToCustomer(pickUpAddress.openTill), presentHourToCustomer(dropOffAddress.openTill),
                orderInDb.id, orderInDb.price_for_customer, orderInDb.price_for_courier, orderInDb.status, courier)
        }

        return new Order(FIELD_DICTIONARY, orderInDb.package_size, pickUpAddress, pickUpAddress.contact, dropOffAddress,
            dropOffAddress.contact, readyForPickup, pickUpDate,
            dropOffDate, orderInDb.comments,
            orderInDb.is_intercity, customer, orderInDb.id, orderInDb.price_for_customer, orderInDb.price_for_courier,
            orderInDb.status, courier)
    }


    static async createCompletedOrderFromDb(completedDbOrder: CompletedDbOrder) {
        const pickUpAddress: Address | undefined = await getAddressById(completedDbOrder.pickup_address)
        const dropOffAddress: Address | undefined = await getAddressById(completedDbOrder.dropoff_address)
        const customer: Customer | null = await getCustomerById(completedDbOrder.customer)
        const courier: Courier | undefined = await getCourierById(completedDbOrder.courier)

        if (!courier) {
            throw new Error("Courier for completed order not found!")
        }

        if (!customer) {
            throw new Error("Customer for completed order not found!")
        }

        if (!pickUpAddress || !dropOffAddress) {
            throw new Error("Address for completed order not found!")
        }

        if (!pickUpAddress.contact || !dropOffAddress.contact) {
            throw new Error("Contact for completed order not found!")
        }

        return new CompletedOrder(completedDbOrder.id, completedDbOrder.final_comment,
            completedDbOrder.price_for_customer, completedDbOrder.price_for_courier,
            customer, courier, pickUpAddress, dropOffAddress, completedDbOrder.is_intercity,
            new Date(completedDbOrder.order_received_in), new Date(completedDbOrder.delivered_in),
            completedDbOrder.comments)
    }
}