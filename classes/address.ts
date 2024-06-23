import * as dbAddresses from "../db/db-addresses";
import {AddressInDb, getAddressById} from "../db/db-addresses";
import {LatlngPoint} from "./latlng-point";
import {priceCalc} from "../main";
import {BasePoint} from "../pricing-algo/base-points-map";


const MAX_DIST_FOR_INTRO_CITY = 12000


export class Address {
    city: string;
    dbId?: string;
    contact?: string;
    openTill?: string;
    streetName: string;
    streetNumber: string;
    postalCode: string;
    cityId: string;
    district: string;
    latlng: LatlngPoint;
    formattedAddress: string;

    constructor(formattedAddress: string, city: string, streetName: string, streetNumber: string, latitude: string, longitude: string, postalCode: string, cityId: string, district: string, contact?: string, dbId?: string, openTill?: string) {
        this.formattedAddress = formattedAddress;
        this.city = city;
        this.streetName = streetName;
        this.streetNumber = streetNumber;
        this.latlng = new LatlngPoint(parseFloat(latitude), parseFloat(longitude));
        this.contact = contact;
        this.dbId = dbId;
        this.openTill = openTill
        this.postalCode = postalCode
        this.cityId = cityId
        this.district = district
    }

    async getDbId(): Promise<string> {
        if (this.dbId) {
            return this.dbId
        } else {
            const addressInDb: AddressInDb | undefined = await dbAddresses.getAddressByValues(this);
            this.dbId = addressInDb?.id

            if (typeof this.dbId === "undefined") {
                throw new Error('Trying to update address for customer not in db')
                // TODO: error handling
            }

            return this.dbId
        }
    }

    public setContact(phone: string) {
        this.contact = phone
    }

    async getContact(): Promise<string | undefined> {
        if (this.contact) {
            return this.contact
        }
        const dbId: string = await this.getDbId()
        const addressFromDb: Address | undefined = await getAddressById(dbId);
        this.contact = addressFromDb?.contact
        return this.contact
    }

    async getOpenTill(): Promise<string | undefined> {
        if (this.openTill) {
            return this.openTill
        }
        const dbId: string = await this.getDbId()
        const addressFromDb: Address | undefined = await getAddressById(dbId);
        this.openTill = addressFromDb?.openTill
        return this.openTill
    }

    checkIfSameCity(otherAddress: Address): boolean {
        const thisProjectedPoint: BasePoint = priceCalc.projectToGrid(this.latlng);
        const otherProjectedPoint: BasePoint = priceCalc.projectToGrid(otherAddress.latlng);

        console.log("Checking if same city. Projected to:\n ", thisProjectedPoint, "\n", otherProjectedPoint)
        console.log("Result of check is: ",  ((thisProjectedPoint.id === otherProjectedPoint.id) || (this.latlng.calcDistance(otherAddress.latlng) < MAX_DIST_FOR_INTRO_CITY)));
        return ((thisProjectedPoint.id === otherProjectedPoint.id) || (this.latlng.calcDistance(otherAddress.latlng) < MAX_DIST_FOR_INTRO_CITY))
    }

    getLat(): number {
        return this.latlng.lat
    }

    getLng(): number {
        return this.latlng.lng
    }

    toString(): string {
        return this.formattedAddress
    }
}