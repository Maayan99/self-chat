import {Order, OrderStatus, PackageSize} from "./order";
import {Address} from "../address";
import {Customer} from "../customer";
import {
    FIELD_DICTIONARY_FROM_BUSINESS,
    formatChangeButton,
    formatValidationField,
    getAnswerHandler
} from "./dicts-and-utility-for-orders";
import {presentNumberToCustomer} from "../../utility/phone-number-utility";
import {formatDateWithoutYear} from "../../utility/date-utility";
import {Section} from "../../client/classes/list";
import {AnswerHandler} from "../../conversation-handler/classes/convo-node";
import {Courier} from "../courier";
import {DeliveryDate} from "../../utility/classes/delivery-date";


export class FromBusinessOrder extends Order {
    private pickUpAddressOpenTill: string
    private dropOffAddressOpenTill: string


    constructor(packageSize: PackageSize,
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
                pickUpAddressOpenTill: string,
                dropOffAddressOpenTill: string,
                id?: string,
                price?: number,
                priceForCouriers?: number,
                status?: OrderStatus,
                courier?: Courier) {
        const calcTimeNow: boolean = !interCity;

        super(FIELD_DICTIONARY_FROM_BUSINESS, packageSize, pickUpAddress, pickUpContact, dropOffAddress, dropOffContact,
            readyForPickup, pickUpDate, dropOffDate, commentsForCourier, interCity, customer,
            id, price, priceForCouriers, status, courier, calcTimeNow);

        this.pickUpAddressOpenTill = pickUpAddressOpenTill;
        this.dropOffAddressOpenTill = dropOffAddressOpenTill;
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

        let dropOffDateStr: string = '';
        if (this.dropOffDate) {
            dropOffDateStr = formatValidationField(this.fieldDict, 'dropOffDate', this.dropOffDate.customerFormatDate());
        }

        let pickUpAddressOpenTillStr: string = ''
        let dropOffAddressOpenTillStr: string = ''
        if (this.interCity) {
            pickUpAddressOpenTillStr = formatValidationField(this.fieldDict, 'pickUpAddressOpenTill', this.pickUpAddressOpenTill || "00:00")
            dropOffAddressOpenTillStr = formatValidationField(this.fieldDict, 'dropOffAddressOpenTill', this.dropOffAddressOpenTill || "00:00")
        }

        const commentsForCourierStr: string = formatValidationField(this.fieldDict, 'commentsForCourier', this.commentsForCourier);


        const generalFields = packageSizeStr + commentsForCourierStr
        const pickUpFields = pickUpAddressStr + pickUpContactStr + pickUpHourStr + pickUpDateStr + readyForPickupStr + pickUpAddressOpenTillStr
        const dropOffFields = dropOffAddressStr + dropOffContactStr + dropOffDateStr + dropOffAddressOpenTillStr

        return this.formatDetailsMessage(generalFields, pickUpFields, dropOffFields)
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
        //dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffHour', this.dropOffHour))
        if (this.dropOffDate) {
            dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffDate', this.dropOffDate.customerFormatDate()))
        }

        if (this.interCity) {
            pickUpFields.push(formatChangeButton(this.fieldDict, 'pickUpAddressOpenTill', this.pickUpAddressOpenTill))
            dropOffFields.push(formatChangeButton(this.fieldDict, 'dropOffAddressOpenTill', this.dropOffAddressOpenTill))
        }


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
        const handlerObjects: {'id': string, 'handler': AnswerHandler}[] = []

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
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'pickUpAddressOpenTill'))
        handlerObjects.push(getAnswerHandler(this.fieldDict, 'dropOffAddressOpenTill'))

        for (const handlerObject of handlerObjects) {
            answerHandlers[handlerObject.id] = handlerObject.handler
        }

        return answerHandlers
    }
}