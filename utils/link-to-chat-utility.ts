const BASE_LINK = 'https://wa.me/'
//const BASE_MESSAGE = 'אשמח%20לפרטים%20נוספים%20על%20משלוח%20'
const BASE_MESSAGE = 'אשמח+לפרטים+על+משלוח+'
const BASE_MESSAGE_ENCODED = '%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%A2%D7%9C%20%D7%9E%D7%A9%D7%9C%D7%95%D7%97%20'
const SHORT_BASE_MESSAGE_ENCODED = '%E2%80%8E%20%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20'
const INVISIBLE_CHARACTER_MESSAGE = 'פרטים '
const BOT_NUMBER = '15550548946'

function generateLink(trackingNumber: string): string {
    return BASE_LINK + BOT_NUMBER + '?text=' + BASE_MESSAGE + trackingNumber
}


export { generateLink, BASE_LINK }