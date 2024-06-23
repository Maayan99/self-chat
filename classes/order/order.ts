import {presentNumberToCustomer} from "../../utility/phone-number-utility";
import {AnswerHandler} from "../../conversation-handler/classes/convo-node";
import {formatDateForDb, formatDateWithoutYear, getISTDate, updateHourMinuteInDate} from "../../utility/date-utility";
import {Section} from "../../client/classes/list";
import {Address} from "../address";
import {generateLink} from "../../utility/link-to-chat-utility";
import {generateUniqueId} from "../../utility/unique-ids-utility";
import {Customer} from "../customer";
import {FieldDict, formatChangeButton, formatValidationField, getAnswerHandler} from "./dicts-and-utility-for-orders";
import {
    BASE_FEE,
    client,
    DISCOUNTED_FEE,
    groupBotClient,
    meshulamClient,
    paidOrders,
    priceCalc, unadvertisedOrders,
    unpaidOrders
} from "../../main";
import * as dbOrders from "../../db/db-orders";
import {OrderInDb} from "../../db/db-orders";
import * as dbCompletedOrders from '../../db/db-completed-orders'
import {CompletedDbOrder} from '../../db/db-completed-orders'
import {Courier} from "../courier";
import {CourierQueueManager} from "../courier-queue-manager";
import {ConversationHandler} from "../../conversation-handler/conversation-handler";
import {
    courierOnboardNewOrderRoot
} from "../../conversation-trees/courier-onboard-new-order-tree/courier-onboard-new-order-root";
import {ORDER_VAR} from "../../conversation-trees/order-details-tree/convo-var-names";
import {COURIER_VAR} from "../../conversation-trees/courier-onboard-new-order-tree/courier-onboarding-convovar-names";
import {notifyAdminsAlert, notifyAdminsError, notifyAdminsUpdate} from "../../utility/admin-notifs-utility";
import {getExpressDropoffForPickupHour} from "../../utility/hour-utility";
import WAWebJS from "whatsapp-web.js";
import {DeliveryDate} from "../../utility/classes/delivery-date";
import {dateForDropoff} from "../../conversation-trees/order-details-tree/non-business-order/dropoff-date-request";

const FULL_DAY = 24 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const CUSTOMER_FINAL_HOUR_OF_DELIVERY = "21:00"
const ID_LENGTH: number = 11

enum SpeedCategory {
    Express,
    Tomorrow,
    Today,
    TwoDays
}

enum OrderStatus {
    Paid = 'שולמה',
    FoundCourier = 'הותאם שליח',
    PickedUp = 'נאספה',
    Delivered = 'נמסרה'
}

enum PackageSize {
    Small = 'משלוח קטן (אופנוע)',
    Big = 'משלוח גדול (רכב פרייבט)',
    Large = 'ענק (רכב מסחרי)',
}


// Period between ads, in minutes
const PERIOD_BETWEEN_ADS = 2;
const SHIFT_QUEUE_TIMEOUT = 1;



function calculateSpeedCategoryBasedOnDates(date1: Date, date2: Date): SpeedCategory {
    if (!(date2 instanceof Date)) {
        throw new Error("Creating order with undefined arrival date");
    }

    if (!(date1 instanceof Date)) {
        date1 = getISTDate();
    }

    if (date1.getDay() === date2.getDay()) {
        if (date1.getHours() + 5 > date2.getHours()) {
            return SpeedCategory.Express
        }
        return SpeedCategory.Today
    }
    if (date1.getDay() === new Date().getDay() + 1) {
        return SpeedCategory.Tomorrow
    }
    return SpeedCategory.TwoDays
}


function presentBooleanValue(value: string | boolean | Address | Date): string {
    if (value instanceof Date) {
        return formatDateWithoutYear(value);
    }
    if (value instanceof Address) {
        return value.formattedAddress
    }
    if (typeof value === 'boolean') {
        return value ? 'כן' : 'לא'
    }
    return value;
}

/**
 * Class representing an Order.
 */
class Order {
    public status: OrderStatus = OrderStatus.Paid;
    protected id: string;

    protected fieldDict: FieldDict;
    protected packageSize: PackageSize;
    protected readyForPickup: boolean;
    protected pickUpAddress: Address;
    protected pickUpContact: string;
    protected dropOffAddress: Address;
    protected dropOffContact: string;
    protected pickUpDate: DeliveryDate;
    protected dropOffDate: DeliveryDate;
    protected commentsForCourier: string
    protected interCity: boolean
    public customer: Customer;
    public assignedCourier?: Courier;

    public advertiseTimoutCallback?: NodeJS.Timeout;
    public shiftQueueTimeoutCallback?: NodeJS.Timeout;

    public courierQueueManager: CourierQueueManager;
    public adsSent: WAWebJS.Message[];


    protected paymentLink: string = '';
    public price: number = 0;
    public priceForCouriers: number = 0;
    public expressPrice: number = 0;
    public todayPrice: number = 0;
    public tomorrowPrice: number = 0
    public twoDayPrice: number = 0;

    public speedCategory: SpeedCategory;

    constructor(fieldDict: FieldDict,
                packageSize: PackageSize,
                pickUpAddress: Address,
                pickUpContact: string,
                dropOffAddress: Address,
                dropOffContact: string,
                readyForPickup: boolean,
                pickUpDate: DeliveryDate,
                dropOffDate: DeliveryDate,
                commentsForCourier: string,
                interCity: boolean,
                customer: Customer,
                id?: string,
                price?: number,
                priceForCouriers?: number,
                status?: OrderStatus,
                courier?: Courier,
                calcTimeNow?: boolean) {
        if (id) {
            this.id = id;
        } else {
            this.id = pickUpAddress.cityId + generateUniqueId(ID_LENGTH) + dropOffAddress.cityId;
        }
        this.fieldDict = fieldDict;
        this.packageSize = packageSize;
        this.pickUpAddress = pickUpAddress;
        this.pickUpContact = pickUpContact;
        this.dropOffAddress = dropOffAddress;
        this.dropOffContact = dropOffContact;
        this.readyForPickup = readyForPickup;
        this.pickUpDate = pickUpDate;
        this.dropOffDate = dropOffDate;
        this.adsSent = [];
        this.commentsForCourier = commentsForCourier;
        this.interCity = interCity;
        this.customer = customer;
        this.assignedCourier = courier
        this.priceForCouriers = priceForCouriers || 0;

        if (calcTimeNow != false) { // Which will happen in all orders other than From Business inter-city
            try {
                this.speedCategory = calculateSpeedCategoryBasedOnDates(pickUpDate.getDate(), dropOffDate.getDate());
            } catch (e) {
                console.error(e);
                throw new Error("Couldn't create order object")
            }
        } else {
            this.speedCategory = SpeedCategory.Express; // Won't be relevant
        }


        if (price) {
            this.price = price
        } else {
            this.calculateAllPrices();
        }

        if (status) {
            this.status = status;
        }

        this.courierQueueManager = new CourierQueueManager()

        unpaidOrders.push(this)
    }

    public getId(): string {
        return this.id
    }


    public getDetailsForCouriers(): string {
        return `*מחיר:* ` + this.priceForCouriers + '\n\n' + this.getDetailsMessageBody()
    }


    public getDetailsMessageBody(): string {
        const packageSizeStr: string = formatValidationField(this.fieldDict, 'packageSize', this.packageSize)
        const pickUpAddressStr: string = formatValidationField(this.fieldDict, 'pickUpAddress', this.pickUpAddress.toString())
        const pickUpContactStr: string = formatValidationField(this.fieldDict, 'pickUpContact', presentNumberToCustomer(this.pickUpContact))
        const dropOffAddressStr: string = formatValidationField(this.fieldDict, 'dropOffAddress', this.dropOffAddress.toString())
        const dropOffContactStr: string = formatValidationField(this.fieldDict, 'dropOffContact', presentNumberToCustomer(this.dropOffContact))
        let readyForPickupStr: string = ''
        let pickUpHourStr: string = ''
        let pickUpDateStr: string = ''
        if (this.readyForPickup) {
            readyForPickupStr = formatValidationField(this.fieldDict, 'readyForPickup', 'כן')
        } else {
            pickUpHourStr = formatValidationField(this.fieldDict, 'pickUpHour', this.pickUpDate.customerFormatHour());
            pickUpDateStr = formatValidationField(this.fieldDict, 'pickUpDate', this.pickUpDate.customerFormatDate());
        }
        const dropOffHourStr: string = formatValidationField(this.fieldDict, 'dropOffHour', this.dropOffDate.customerFormatHour());
        const dropOffDateStr: string = formatValidationField(this.fieldDict, 'dropOffDate', this.dropOffDate.customerFormatDate());
        const commentsForCourierStr: string = formatValidationField(this.fieldDict, 'commentsForCourier', this.commentsForCourier);


        const generalFields = packageSizeStr + commentsForCourierStr
        const pickUpFields = pickUpAddressStr + pickUpContactStr + pickUpHourStr + pickUpDateStr + readyForPickupStr
        const dropOffFields = dropOffAddressStr + dropOffContactStr + dropOffHourStr + dropOffDateStr

        return this.formatDetailsMessage(generalFields, pickUpFields, dropOffFields)
    }


    public formatDetailsMessage(generalFields: string, pickUpFields: string, dropOffFields: string) {
        return '*פרטים כלליים:*\n' + generalFields + "\n*פרטי איסוף:*\n" + pickUpFields + "\n*פרטי מסירה:*\n" + dropOffFields
    }


    public getValidationMessageSections(): Section[] {
        const generalFields = []
        generalFields.push(formatChangeButton(this.fieldDict, 'packageSize', this.packageSize))
        generalFields.push(formatChangeButton(this.fieldDict, 'commentsForCourier', this.commentsForCourier))

        const pickUpFields = []
        pickUpFields.push(formatChangeButton(this.fieldDict, 'pickUpAddress', this.pickUpAddress.toString()))
        pickUpFields.push(formatChangeButton(this.fieldDict, 'pickUpContact', presentNumberToCustomer(this.pickUpContact)))
        if (this.readyForPickup) {
            pickUpFields.push(formatChangeButton(this.fieldDict, 'readyForPickup', 'כן'))
        } else {
            pickUpFields.push(formatChangeButton(this.fieldDict, 'pickUpHour', this.pickUpDate.customerFormatHour()))
            pickUpFields.push(formatChangeButton(this.fieldDict, 'pickUpDate', this.pickUpDate.customerFormatDate()))
        }

        const dropOffFields = []
        dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffAddress', this.dropOffAddress.toString()))
        dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffContact', presentNumberToCustomer(this.dropOffContact)))
        dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffHour', this.dropOffDate.customerFormatHour()))
        dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffDate', this.dropOffDate.customerFormatDate()))

        return [
            {
                title: 'שינוי פרטים כלליים',
                rows: generalFields
            },
            {
                title: 'שינוי פרטי איסוף',
                rows: pickUpFields
            },
            {
                title: 'שינוי פרטי מסירה',
                rows: dropOffFields
            }
        ]
    }


    public getValidationMessageHandlers(): { [key: string]: AnswerHandler } {
        const answerHandlers: { [key: string]: AnswerHandler } = {}
        const handlerObjects: { 'id': string, 'handler': AnswerHandler }[] = []

        handlerObjects.push(getAnswerHandler(this.fieldDict, 'packageSize'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'commentsForCourier'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'pickUpAddress'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'pickUpContact'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'readyForPickup'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'pickUpHour'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'pickUpDate'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'dropOffAddress'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'dropOffContact'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'dropOffHour'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'dropOffDate'))

        for (const handlerObject of handlerObjects) {
            answerHandlers[handlerObject.id] = handlerObject.handler
        }

        return answerHandlers
    }

    public calculatePrice(): void {
        switch (this.speedCategory) {
            case SpeedCategory.Express:
                this.price = this.expressPrice
                this.applyFee();
                return
            case SpeedCategory.Today:
                this.price = this.todayPrice
                this.applyFee();
                return
            case SpeedCategory.Tomorrow:
                this.price = this.tomorrowPrice
                this.applyFee();
                return
            case SpeedCategory.TwoDays:
                this.price = this.twoDayPrice
                this.applyFee();
                return
        }
    }

    public getPrice(): number {
        if (this.price === 0) {
            this.calculateAllPrices();
        }
        return this.price
    }

    public async getPaymentLink(): Promise<string> {
        if (this.paymentLink === '') {
            this.paymentLink = await this.generatePaymentLink()
        }
        return this.paymentLink
    }

    public generateAdvertMessage(): string {
        let message = '*משלוח ב-' + this.priceForCouriers + '₪*\n\n'


        message = message + this.packageSize + '📦\n'
        message = message + 'מ' + this.pickUpAddress.city
        message = message + ' ל' + this.dropOffAddress.city + '🏠\n'
        message = message + 'למסירה ב' + this.dropOffDate.customerFormatDate() + '📅\n\n'

        message = message + 'לפנייה וקבלת המשלוח לחצו: ' + generateLink(this.getId())

        return message
    }


    public startAdvertisementCampaign() {
        dbOrders.updatePriceForCouriers(this)

        // Remove from unadvertised orders array
        const index: number = unadvertisedOrders.indexOf(this);
        if (index !== -1) {
            unadvertisedOrders.splice(index, 1);
        }

        this.advertise()
    }


    public advertise(): void {
        groupBotClient.sendToRelevantGroups(this)
        this.advertiseTimoutCallback = setTimeout(this.advertiseIfQueueIsEmpty.bind(this), PERIOD_BETWEEN_ADS * 60 * 1000)
    }

    public advertiseIfQueueIsEmpty(): void {
        if (this.courierQueueManager.isEmpty()) {
            if (this.priceForCouriers * 1.05 > this.price) {
                notifyAdminsAlert('משלוח מספר ' + this.getId() +
                    ' לא נמכר! המשלוח כרגע עומד למכירה עבור ' + this.priceForCouriers +
                    '₪. פרטי המשלוח:\n\n' + this.getDetailsMessageBody())
            } else {
                this.raiseCourierPrice()
                this.advertise()
            }
        } else {
            this.advertiseTimoutCallback = setTimeout(this.advertiseIfQueueIsEmpty.bind(this), PERIOD_BETWEEN_ADS * 60 * 1000)
        }
    }

    public raiseCourierPrice(): void {
        this.priceForCouriers = Math.floor(this.priceForCouriers * 1.0578) // Will raise by about 5% of CUSTOMER's price
        dbOrders.updatePriceForCouriers(this);
    }

    public getTags(): string[] {
        return [this.pickUpAddress.city, this.pickUpAddress.city]
    }

    public setSpeedCategory(category: SpeedCategory) {
        this.speedCategory = category
        switch (category) {
            case SpeedCategory.Express:
                this.dropOffDate = new DeliveryDate({ date: this.pickUpDate.getDate() } );
                this.dropOffDate.setExpressTiming();
                break;
            case SpeedCategory.Today:
                this.dropOffDate = new DeliveryDate({ date: this.pickUpDate.getDate() } );
                this.dropOffDate.setEndOfDayTiming();
                break;
            case SpeedCategory.Tomorrow:
                this.dropOffDate = new DeliveryDate({ date: this.pickUpDate.getDate() } );
                this.dropOffDate.addOneDay();
                this.dropOffDate.setEndOfDayTiming()
                break;
            case SpeedCategory.TwoDays:
                this.dropOffDate = new DeliveryDate({ date: this.pickUpDate.getDate() } );
                this.dropOffDate.addOneDay();
                this.dropOffDate.addOneDay();
                this.dropOffDate.setEndOfDayTiming()
                break;
        }
    }

    public updateSpeedCategory(): void {
        this.speedCategory = calculateSpeedCategoryBasedOnDates(this.pickUpDate.getDate(), this.dropOffDate.getDate());
    }


    public async generatePaymentLink(): Promise<string> {
        return await meshulamClient.generatePaymentLink(this);
    }

    public async resendPaymentLink(): Promise<void> {
        this.paymentLink = await this.generatePaymentLink();

        await client.sendMessage("פג תוקפו של הלינק הקודם! אנא השתמש בלינק החדש: " + this.paymentLink, this.customer.phone);
    }

    public async timeoutOnPayment(): Promise<void> {
        // Notify customer on timout
        await client.sendMessage("אנו מתנצלים, אך פג תוקפה של ההזמנה. ליצירת הזמנה חדשה, אנא שלחו כל הודעה", this.customer.phone);

        unpaidOrders.splice(unpaidOrders.indexOf(this)); // Remove from order list
    }

    public calculateAllPrices(): void {
        if (this.interCity) {
            this.expressPrice = priceCalc.calculateIntercityPrice(this.pickUpAddress.latlng, this.dropOffAddress.latlng, SpeedCategory.Express, this.packageSize)
            this.todayPrice = priceCalc.calculateIntercityPrice(this.pickUpAddress.latlng, this.dropOffAddress.latlng, SpeedCategory.Today, this.packageSize)
            this.tomorrowPrice = priceCalc.calculateIntercityPrice(this.pickUpAddress.latlng, this.dropOffAddress.latlng, SpeedCategory.Tomorrow, this.packageSize)
            this.twoDayPrice = priceCalc.calculateIntercityPrice(this.pickUpAddress.latlng, this.dropOffAddress.latlng, SpeedCategory.TwoDays, this.packageSize)
        } else {
            this.expressPrice = priceCalc.calculatePrice(this.pickUpAddress.latlng, this.dropOffAddress.latlng, this.packageSize);
            this.todayPrice = this.expressPrice;
            this.tomorrowPrice = this.expressPrice;
            this.twoDayPrice = this.expressPrice;
        }

        this.calculatePrice();
    }

    public priceWithFee(price: number) {
        if ((this.customer.getIfReturningCustomer() && this.interCity) || this.price > 400) {
            return Math.floor(price * (1 + DISCOUNTED_FEE));
        } else {
            return Math.floor(price * (1 + BASE_FEE));
        }
    }


    public applyFee(): void {
        if ((this.customer.getIfReturningCustomer() && this.interCity) || this.price > 400) {
            this.priceForCouriers = this.price;
            this.price = Math.floor(this.price * (1 + DISCOUNTED_FEE))
        } else {
            this.priceForCouriers = this.price;
            this.price = Math.floor(this.price * (1 + BASE_FEE));
        }
    }

    public async getDbObject(): Promise<OrderInDb> {
        return {
            id: this.id,
            package_size: this.packageSize,
            pickup_date: this.pickUpDate.dbFormat(),
            dropoff_date: this.dropOffDate.dbFormat(),
            price_for_customer: this.price,
            price_for_courier: this.priceForCouriers,
            customer: await this.customer.getDbId(),
            courier: await this.assignedCourier?.getDbId(),
            pickup_address: await this.pickUpAddress.getDbId(),
            dropoff_address: await this.dropOffAddress.getDbId(),
            is_intercity: this.interCity,
            order_received_in: formatDateForDb(getISTDate()), // Not actually used
            comments: this.commentsForCourier,
            status: this.status
        }
    }

    public addToQueue(courier: Courier): void {
        const alsoStartConvo: boolean = this.courierQueueManager.isEmpty()
        this.courierQueueManager.add(courier)

        if (alsoStartConvo) {
            this.startConvoWithCourier(courier)
            this.shiftQueueTimeoutCallback = setTimeout(this.shiftQueueTimeout.bind(this), SHIFT_QUEUE_TIMEOUT * 60 * 1000)
        } else {
            // Send a message while courier waits in line
            client.sendMessage('שליחים אחרים התעניינו במשלוח - אעדכן אותך בהקדם עם הפרטים אם יסרבו, או אם הוא יימכר.', courier.phone);
        }

        console.log("Added to queue. Updated queue: ", this.courierQueueManager)
    }

    /**
     * Shifts the queue of couriers and starts a conversation with the next courier in the queue, if available.
     */
    public shiftQueue(): void {
        this.courierQueueManager.shift()
        const courier: Courier | undefined = this.courierQueueManager.getNextInQueue()
        if (courier !== undefined) {
            this.startConvoWithCourier(courier)
        } else {
            clearTimeout(this.shiftQueueTimeoutCallback)
        }

        console.log("Shifted queue. Updated queue: ", this.courierQueueManager)
    }

    public shiftQueueTimeout(): void {
        this.shiftQueue()
        if (!this.courierQueueManager.isEmpty()) {
            this.shiftQueueTimeoutCallback = setTimeout(this.shiftQueueTimeout.bind(this), SHIFT_QUEUE_TIMEOUT * 60 * 1000)
        }
    }

    public startConvoWithCourier(courier: Courier): void {
        const handler: ConversationHandler = new ConversationHandler(courierOnboardNewOrderRoot, courier, client, {
            [ORDER_VAR]: this,
            [COURIER_VAR]: courier,
        })

        handler.startConversation()
    }

    public async setCourier(courier: Courier) {
        this.assignedCourier = courier
        this.status = OrderStatus.FoundCourier
        await dbOrders.setAssignedCourierInDb(this, courier);

        // Turn off the callbacks
        clearTimeout(this.shiftQueueTimeoutCallback)
        clearTimeout(this.advertiseTimoutCallback)

        // Notify all the other couriers that it's been sold
        console.log("Trying to notify other couriers")
        this.courierQueueManager.notifyOtherCouriersThatOrderWasSold(courier)

        // Delete messages
        groupBotClient.deleteMessages(this.adsSent);

        // Notify the admins about the sale
        notifyAdminsUpdate('הזמנה מס׳ _' + this.id + '_ מ: _' + this.pickUpAddress.formattedAddress + '_ ל: _'
            + this.dropOffAddress.formattedAddress + '_ שמחירו *' + this.price + '₪* נמכרה עבור *' +
            this.priceForCouriers + '₪*. הרווח על העסקה הוא ' + (this.price - this.priceForCouriers) + '₪ שהוא *' +
            Math.round(((this.price - this.priceForCouriers) / this.price)*100)
            + '%* מסך העסקה. המשלוח נמכר לשליח ' + presentNumberToCustomer(this.assignedCourier.phone))

        client.sendMessage('הזמנה מספר ' + this.id + ' הותאמה לשליח! הוא יהיה בקשר איתכם כשיגיע הזמן לאסוף את החבילה', this.customer.phone)
    }


    public async updateStatusToPickedUp() {
        this.status = OrderStatus.PickedUp
        await dbOrders.updateOrderStatus(this, OrderStatus.PickedUp)
        client.sendMessage('הזמנה מספר ' + this.id + ' נאספה! השליח ייצור עם איש הקשר בנקודת המסירה ויתאם את המסירה', this.customer.phone)
    }

    public async setOrderAsDelivered() {
        if (!this.assignedCourier) {
            throw new Error("Trying to set order as completed for an order with no courier!")
        }

        this.status = OrderStatus.Delivered
        await dbOrders.deleteOrderFromActiveOrderTable(this);
        await dbCompletedOrders.addCompletedOrderToDb(this);
        await this.assignedCourier.setActiveOrderAsCompleted(this);

        paidOrders.splice(paidOrders.indexOf(this), 1) // Remove from the list of outstanding orders

        // Notify admins
        notifyAdminsUpdate('הזמנה מס׳ _' + this.id + '_ מ_' + this.pickUpAddress.formattedAddress + '_ ל_'
            + this.dropOffAddress.formattedAddress + ' נמסרה בהצלחה.')

        // TODO: Request feedback from customer etc.
        client.sendMessage('הזמנה מספר ' + this.id + ' נמסרה! תודה שהשתמשתם בשירותינו :)', this.customer.phone)
    }


    public async generateCompletedOrderObject(): Promise<CompletedDbOrder> {
        if (!this.assignedCourier) {
            throw new Error("Trying to generate a complete order object for an order with no courier!")
        }

        return {
            id: this.id,
            final_comment: 'חוויה מצוינת',
            price_for_customer: this.price,
            price_for_courier: this.priceForCouriers,
            customer: await this.customer.getDbId(),
            courier: await this.assignedCourier?.getDbId(),
            pickup_address: await this.pickUpAddress.getDbId(),
            dropoff_address: await this.dropOffAddress.getDbId(),
            is_intercity: this.interCity,
            order_received_in: formatDateForDb(getISTDate()), // TODO: Keep the correct date
            delivered_in: formatDateForDb(getISTDate()), // Not used when inserting order
            comments: this.commentsForCourier,
        }
    }


    public getIfIntercity(): boolean {
        return this.interCity
    }

    public toString(): string {
        return `${this.pickUpAddress.city}-${this.dropOffAddress.city}`
    }

    public toWaString(): string {
        return `*${this.id}:* `
            + `-${this.pickUpAddress} `
            + `ל${this.dropOffAddress} `
            + `למסירה - ${this.dropOffDate.customerFormatDate()}`
    }

    public getPickupAddress(): string {
        return this.pickUpAddress.formattedAddress
    }

    public getDropoffAddress(): string {
        return this.dropOffAddress.formattedAddress
    }

    public getPickupHour(): string {
        return this.pickUpDate.customerFormatHour()
    }

    public getDropoffHour(): string {
        return this.dropOffDate.customerFormatHour()
    }

    public getDropoffDate(): DeliveryDate {
        return this.dropOffDate
    }

    public getPickupContact(): string {
        return this.pickUpContact
    }


    public getDropoffContact(): string {
        return this.pickUpContact
    }

    public getPriceForCourier(): number {
        return this.priceForCouriers
    }

    public getTimeoutLengthForIntroCityOrders(): number {
        const currentTime = getISTDate().getTime();
        return this.dropOffDate.getTime() - currentTime - ONE_HOUR;
    }

    public addAdToList(message: WAWebJS.Message): void {
        this.adsSent.push(message);
    }
}


export {CUSTOMER_FINAL_HOUR_OF_DELIVERY, Order, SpeedCategory, OrderStatus, PackageSize}