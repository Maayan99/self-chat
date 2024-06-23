import {dbDateToObject, getISTDate, updateHourMinuteInDate} from "../date-utility";
import {getExpressDropoffFromNow, parseHour} from "../hour-utility";



const EXPRESS_HOUR_INDICATOR = 'express-hour';
const END_OF_DAY_HOUR_INDICATOR = 'end-of-day-hour';
const END_OF_DAY_HOUR = '21:00';
const END_OF_DAY_HOUR_NUMBER = 21;
const END_OF_DAY_MINUTES_NUMBER = 0;
const EXPRESS_TIMING = 4;
const MILIS_IN_HOUR = 60 * 60 * 1000;
const HOURS_IN_DAY = 24;


function getDateFromString(dateMonthStr: string): Date {
    const date = dateMonthStr.split('.')
    if (date.length !== 2 || date[0].length !== 2 || date[1].length !== 2) {
        throw new Error("Invalid date data")
    }

    const day: number = parseInt(date[0])
    const month: number = parseInt(date[1])

    if (!day || !month) {
        throw new Error("Invalid date data")
    }

    if (day < 1 || month < 1 || day > 31 || month > 12) {
        throw new Error("Invalid date data")
    }

    const dateObject: Date = getISTDate()
    dateObject.setMonth(month - 1)
    dateObject.setDate(day)
    return dateObject
}




/**
 * @param choice a number between 0 and 4 (inclusive) that indicates the choice of the customer
 * between the next five days (excluding saturday)
 * Note that the function can handle any number, but only 0 to 4 should be inputted usually
 * @returns a date object that represents the choice of the customer
 */
function getDateFromFiveDayChoice(choice: number) {
    const date = getISTDate()
    for (let i = 0; i < choice; i++) {
        date.setDate(date.getDate() + 1)
        if (date.getDay() === 6) {
            date.setDate(date.getDate() + 1)
        }
    }

    return date
}





/**
 * Pads a number with leading zeros if needed.
 *
 * @param {number} value - The number to be padded.
 * @return {string} The padded number as a string.
 */
const padWithZerosIfNeeded = (value: number): string => {
    return value < 10 ? `0${value}` : `${value}`;
}



function dateFromDb(dbDate: string): Date {
    const t = dbDate.split(/[- :]/).map(str => parseInt(str));
    return new Date(t[0], t[1] - 1, t[2], t[3] || 0, t[4] || 0, t[5] || 0);
}



/**
 * A wrapper for the basic Date object, with methods that allow for
 * more elegant manipulation of delivery dates and hours.
 */
export class DeliveryDate {
    private date: Date;

    constructor(dateData: { date?: Date, dayMonthStr?: string, fiveDayChoice?: number, hourStr?: string, dbRepresentation?: string }) {
        if (dateData.date) {
            this.date = dateData.date;
        } else if (dateData.dayMonthStr) {
            this.date = getDateFromString(dateData.dayMonthStr);
        } else if (dateData.fiveDayChoice) {
            this.date = getDateFromFiveDayChoice(dateData.fiveDayChoice);
        } else if (dateData.dbRepresentation) {
            this.date = dateFromDb(dateData.dbRepresentation);
        } else {
            this.date = getISTDate(); //TODO: Move this func to this file
        }

        if (dateData.hourStr) {
            if (dateData.hourStr === EXPRESS_HOUR_INDICATOR) {
                dateData.hourStr = getExpressDropoffFromNow()
            } else if (dateData.hourStr === END_OF_DAY_HOUR_INDICATOR) {
                dateData.hourStr = END_OF_DAY_HOUR;
            }
            this.date = updateHourMinuteInDate(this.date, dateData.hourStr);
        }
    }


    public setExpressTiming() {
        this.date.setTime(this.date.getTime() + EXPRESS_TIMING * MILIS_IN_HOUR)
    }

    public setEndOfDayTiming() {
        this.date.setHours(END_OF_DAY_HOUR_NUMBER);
        this.date.setMinutes(END_OF_DAY_MINUTES_NUMBER);
    }

    public addOneDay() {
        this.date.setTime(this.date.getTime() + HOURS_IN_DAY * MILIS_IN_HOUR);
    }

    public addOneHour() {
        this.date.setTime(this.date.getTime() + MILIS_IN_HOUR);
    }

    public dbFormat(): string {
        const year: string = `${this.date.getFullYear()}`;
        const month: string = padWithZerosIfNeeded(this.date.getMonth() + 1); // +1 because months range from - to 11
        const day: string = padWithZerosIfNeeded(this.date.getDay());
        const hour: string = padWithZerosIfNeeded(this.date.getHours());
        const minutes: string = padWithZerosIfNeeded(this.date.getMinutes());

        return `${year}/${month}/${day} ${hour}:${minutes}:00`;
    }

    public customerFormatDate(): string {
        const currentTime = getISTDate();
        if (this.date.getDate() === currentTime.getDate()) {
            return 'היום';
        } else if (this.date.getDate() === currentTime.getDate() + 1 || ((this.date.getMonth() === currentTime.getMonth() + 1) && (this.date.getDate() === 1))) {
            return 'מחר';
        }
        return `${padWithZerosIfNeeded(this.date.getDate())}/${padWithZerosIfNeeded(this.date.getMonth() + 1)}`
    }

    public customerFormatHour(): string {
        return `${padWithZerosIfNeeded(this.date.getHours())}:${padWithZerosIfNeeded(this.date.getMinutes())}`;
    }


    public updateHour(hourStr: string): void {
        let hourStrStripped: string[] = hourStr.replace(' ', '').split(':')

        // If we have a case of "12:12:23", keep only the hours and minutes and drop the seconds
        if (hourStrStripped.length === 3) {
            hourStrStripped = hourStrStripped.slice(0, 2);
        }

        if (hourStrStripped.length !== 2) {
            throw new Error("Invalid hour data");
        }

        const hour: number = parseInt(hourStrStripped[0])
        const minute: number = parseInt(hourStrStripped[1])

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            throw new Error("Invalid hour data");
        }

        this.date.setHours(hour)
        this.date.setMinutes(minute)
    }


    public getDate(): Date {
        return this.date
    }

    public setDate(date: Date) {
        this.date = date;
    }

    public getTime() {
        return this.date.getTime();
    }

    public toISOString() {
        return this.date.toISOString();
    }

}


export { EXPRESS_HOUR_INDICATOR, END_OF_DAY_HOUR_INDICATOR }