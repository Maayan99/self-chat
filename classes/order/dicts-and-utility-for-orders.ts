import {AnswerHandler} from "../../conversation-handler/classes/convo-node";
import {changePackageSize} from "../../conversation-trees/order-details-tree/change-details/change-package-size";
import {
    changePickUpAddressForNonBusiness
} from "../../conversation-trees/order-details-tree/change-details/change-pickup-address-for-non-business";
import {changePickUpContact} from "../../conversation-trees/order-details-tree/change-details/change-pickup-contact";
import {commentsForCourier} from "../../conversation-trees/order-details-tree/comments-for-courier-node";
import {
    changeBusinessAddress
} from "../../conversation-trees/order-details-tree/change-details/change-business-address";
import {
    changeOtherAddressForBusiness
} from "../../conversation-trees/order-details-tree/change-details/change-other-address-for-business";
import {
    changeDropoffAddressForNonBusiness
} from "../../conversation-trees/order-details-tree/change-details/change-dropoff-address-non-business";
import {changeDropOffContact} from "../../conversation-trees/order-details-tree/change-details/change-dropoff-contact";
import {
    changeDropOffHour,
    changePickUpHour
} from "../../conversation-trees/order-details-tree/change-details/change-pickup-or-dropoff-hour";
import {
    changeDropOffDate,
    changePickUpDate
} from "../../conversation-trees/order-details-tree/change-details/change-pickup-or-dropoff-date";
import {
    changeDropOffUntil,
    changePickUpUntil
} from "../../conversation-trees/order-details-tree/change-details/change-open-till";
import {changeReadyForPickup} from "../../conversation-trees/order-details-tree/change-details/change-ready-for-pickup";
import {
    changeDateToReceiveDelivery
} from "../../conversation-trees/order-details-tree/change-details/change-date-to-receive-delivery";

type FieldDetails = {
    name: string,
    id: string,
    changeNode: AnswerHandler,
}

type FieldDict =  { [key: string]: FieldDetails };



const BASE_DICT: FieldDict = {
    packageSize: {
        name: 'גודל המשלוח📦',
        id: '1',
        changeNode: changePackageSize,
    },
    pickUpHour: {
        name: 'שעת איסוף⏱️',
        id: '2',
        changeNode: changePickUpHour,
    },
    pickUpDate: {
        name: 'תאריך איסוף📅',
        id: '3',
        changeNode: changePickUpDate,
    },
    dropOffHour: {
        name: 'שעת מסירה⏱️',
        id: '4',
        changeNode: changeDropOffHour,
    },
    readyForPickup: {
        name: 'מוכן לאיסוף✅',
        id: '6',
        changeNode: changeReadyForPickup
    },
    commentsForCourier: {
        name: 'הערות לשליח✍️',
        id: '7',
        changeNode: commentsForCourier,
    }
}


const NON_BUSINESS_FIELD_DICT_SPECIAL_PROPERTIES: FieldDict = {
    pickUpAddress: {
        name: 'כתובת איסוף🏠',
        id: '11',
        changeNode: changePickUpAddressForNonBusiness,
    },
    pickUpContact: {
        name: 'איש קשר בנקודת איסוף👤',
        id: '12',
        changeNode: changePickUpContact,
    },
    dropOffAddress: {
        name: 'כתובת מסירה🏠',
        id: '13',
        changeNode: changeDropoffAddressForNonBusiness,
    },
    dropOffContact: {
        name: 'איש קשר בנקודת מסירה👤',
        id: '14',
        changeNode: changeDropOffContact,
    },
    dropOffDate: {
        name: 'תאריך מסירה📅',
        id: '5',
        changeNode: changeDropOffDate,
    },
}






const FIELD_DICTIONARY_FROM_BUSINESS_SPECIAL_PROPERTIES: FieldDict = {
    pickUpAddress: {
        name: 'כתובת איסוף🏠',
        id: '11',
        changeNode: changeBusinessAddress,
    },
    pickUpContact: {
        name: 'איש קשר בנקודת איסוף👤',
        id: '12',
        changeNode: changePickUpContact,
    },
    dropOffAddress: {
        name: 'כתובת מסירה🏠',
        id: '13',
        changeNode: changeOtherAddressForBusiness,
    },
    dropOffContact: {
        name: 'איש קשר בנקודת מסירה👤',
        id: '14',
        changeNode: changeDropOffContact,
    },
    pickUpAddressOpenTill: {
        name: 'שעת גג בכתובת איסוף⏱️',
        id: '15',
        changeNode: changePickUpUntil,
    },
    dropOffAddressOpenTill: {
        name: 'שעת גג בכתובת מסירה⏱️',
        id: '16',
        changeNode: changeDropOffUntil,
    },
    dropOffDate: {
        name: 'תאריך מסירה📅',
        id: '5',
        changeNode: changeDateToReceiveDelivery,
    },
}



const FIELD_DICTIONARY_TO_BUSINESS_SPECIAL_PROPERTIES: FieldDict = {
    pickUpAddress: {
        name: 'כתובת איסוף🏠',
        id: '11',
        changeNode: changeOtherAddressForBusiness,
    },
    pickUpContact: {
        name: 'איש קשר בנקודת איסוף👤',
        id: '12',
        changeNode: changePickUpContact,
    },
    dropOffAddress: {
        name: 'כתובת מסירה🏠',
        id: '13',
        changeNode: changeBusinessAddress,
    },
    dropOffContact: {
        name: 'איש קשר בנקודת מסירה👤',
        id: '14',
        changeNode: changeDropOffContact,
    },
    pickUpAddressOpenTill: {
        name: 'שעת גג בכתובת איסוף⏱️',
        id: '15',
        changeNode: changePickUpUntil,
    },
    dropOffAddressOpenTill: {
        name: 'שעת גג בכתובת מסירה⏱️',
        id: '16',
        changeNode: changeDropOffUntil,
    },
    dropOffDate: {
        name: 'תאריך מסירה📅',
        id: '5',
        changeNode: changeDateToReceiveDelivery,
    },
}



const FIELD_DICTIONARY: FieldDict = {...BASE_DICT, ...NON_BUSINESS_FIELD_DICT_SPECIAL_PROPERTIES}
const FIELD_DICTIONARY_TO_BUSINESS = {...BASE_DICT, ...FIELD_DICTIONARY_TO_BUSINESS_SPECIAL_PROPERTIES}
const FIELD_DICTIONARY_FROM_BUSINESS = {...BASE_DICT, ...FIELD_DICTIONARY_FROM_BUSINESS_SPECIAL_PROPERTIES}


function getAnswerHandler(dict: FieldDict, fieldName: string): {'id': string, 'handler': AnswerHandler} {
    const fieldDetails: FieldDetails = dict[fieldName]
    return { id: fieldDetails.id, handler: fieldDetails.changeNode }
}

function formatChangeButton(dict: FieldDict, fieldName: string, value: string) {
    const fieldDetails: FieldDetails = dict[fieldName]
    return {
        title: fieldDetails.name,
        description: value,
        id: fieldDetails.id,
    }
}

function formatValidationField(dict: FieldDict, fieldName: string, value: string | false) {
    if (!value) {
        return ''
    }
    return `${dict[fieldName].name}: _${value}_\n`
}



export { formatValidationField, formatChangeButton, getAnswerHandler, FIELD_DICTIONARY, FIELD_DICTIONARY_FROM_BUSINESS, FIELD_DICTIONARY_TO_BUSINESS, FieldDict, FieldDetails}