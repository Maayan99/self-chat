import {Address} from "../classes/address";
import {Customer} from "../classes/customer";
import {getCustomer} from "./db-customers";
import {query} from "./db";
import {removeArrayDuplicates} from "../utility/general-utility";

type AddressInDb = {
    'maker': string,
    'contact': string,
    'open_till': string,
    'formatted': string,
    'city': string,
    'street': string,
    'street_nm': string,
    'lat': string,
    'lng': string,
    'id': string,
    'postal_code': string,
    'city_id': string,
    'district': string
}

const convertDbAddressToObject = (address: AddressInDb): Address => {
    return new Address(address.formatted, address.city, address.street, address.street_nm, address.lat, address.lng, address.postal_code, address.city_id, address.district, address.contact, address.id, address.open_till);
}

const getAddressByValues = async(address: Address): Promise<AddressInDb | undefined> => {
    const queryString = 'SELECT * FROM addresses WHERE formatted = $1 AND city = $2 AND street = $3 AND street_nm = $4 AND lat = $5 AND lng = $6'
    const queryVars = [address.formattedAddress, address.city, address.streetName, address.streetNumber, `${address.getLat()}`, `${address.getLng()}`]
    const queryResults = await query(queryString, queryVars);

    if (queryResults.rows) {
        return queryResults.rows[0]
    } else {
        return
    }
}

const getAddressById = async(id: string): Promise<Address | undefined> => {
    const queryString = 'SELECT * FROM addresses WHERE id = $1'
    const queryVars = [id]
    const queryResults = await query(queryString, queryVars);

    if (queryResults.rows) {
        return convertDbAddressToObject(queryResults.rows[0])
    } else {
        return
    }
}

const getCustomersAddress = async(phone: string): Promise<Address | null> => {
    const customer: Customer | null = await getCustomer(phone)
    const addressId: string | undefined = customer?.addressId
    if (addressId){
        const address: { 'rows': AddressInDb[] } = await query('SELECT * FROM addresses WHERE id = $1', [addressId])
        if (address && address.rows) {
            return convertDbAddressToObject(address.rows[0])
        }
        return null
    } else {
        return null
    }
}

const createAddressAndUpdateCustomer = async(customer: Customer, address: Address)=>  {
    try {
        // Get customer id
        const makerId: string = await customer.getDbId()

        const insertAddressQuery: string = 'INSERT INTO addresses (maker, contact, formatted, city, street, street_nm, lat, lng, postal_code, city_id, district) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id'
        const insertAddressValues: string[] = [makerId, address.contact || customer.phone, address.formattedAddress, address.city, address.streetName, address.streetNumber, `${address.getLat()}`, `${address.getLng()}`, address.postalCode, address.cityId, address.district];
        const insertAddressResult = await query(insertAddressQuery, insertAddressValues);
        const newAddressId = insertAddressResult.rows[0].id;

        const updateCustomerQuery: string = 'UPDATE customers SET address = $1 WHERE phone = $2';
        const updateCustomerValues = [newAddressId, customer.phone];
        await query(updateCustomerQuery, updateCustomerValues)

        //console.log(`Address created with ID ${newAddressId}, and customer with phone ${customer.phone} updated with the new address ID.`);
    } catch(err) {
        console.error(err);
    }
}

const getLastUsedAddresses = async(customer: Customer): Promise<Address[] | null> => {
    const customerId: string = await customer.getDbId()

    const customerQueryResults = await query('SELECT * FROM customers WHERE id = $1', [customerId])
    const lastUsedAddressIds: string[] = customerQueryResults.rows[0].last_used_addresses

    // Extract only the unique IDs
    const uniqueAddressIds: string[] = removeArrayDuplicates(lastUsedAddressIds)

    if (lastUsedAddressIds !== null) {
        const queryForAddresses: string = 'SELECT * FROM addresses WHERE id = $1'

        // Query each address and return it converted to an address object
        return await Promise.all(uniqueAddressIds.map(async (id: string) => {
            const dbQueryResult = await query(queryForAddresses, [id]);
            const dbAddress: AddressInDb = dbQueryResult.rows[0]
            return convertDbAddressToObject(dbAddress)
        }))
    } else {
        return null
    }
}

const createLastUsedAddressAndUpdateCustomer = async(customer: Customer, address: Address)=> {
    try {
        // Get customer id
        const makerId: string = await customer.getDbId()

        const insertAddressQuery: string = 'INSERT INTO addresses (maker, formatted, city, street, street_nm, lat, lng, postal_code, city_id, district) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id'
        const insertAddressValues: string[] = [makerId, address.formattedAddress, address.city, address.streetName, address.streetNumber, `${address.getLat()}`, `${address.getLng()}`, address.postalCode, address.cityId, address.district];
        const insertAddressResult = await query(insertAddressQuery, insertAddressValues);
        const newAddressId = insertAddressResult.rows[0].id;

        const updateCustomerQuery: string = "UPDATE customers SET last_used_addresses = array_append(last_used_addresses,$1) WHERE phone = $2";
        const updateCustomerValues = [newAddressId, customer.phone];
        await query(updateCustomerQuery, updateCustomerValues)

        //console.log(`Last used address created with ${newAddressId}, and customer with phone ${customer.phone} updated with the new address ID.`);
    } catch (err) {
        console.error(err);
    }
}

const updateCustomerLastUsedAddresses = async(customer: Customer, address: Address)=> {
    try {
        // Get customer id
        const addressDbId: string = await address.getDbId()

        // Move the address to the "front" (i.e. remove it and reappend it so it appears in the
        const updateCustomerQuery: string = "UPDATE customers SET last_used_addresses = array_append(array_remove(last_used_addresses,$1),$1) WHERE phone = $2";
        const updateCustomerValues: string[] = [addressDbId, customer.phone];
        await query(updateCustomerQuery, updateCustomerValues)

        const loggingQuery = await query('SELECT * FROM customers WHERE phone = $1', [customer.phone]);
        //console.log(loggingQuery.rows[0].last_used_addresses) // This is the array of last used addresses, which should now be the address we just added.

        //console.log(`Updated last used address ${addressDbId}, in customer with phone ${customer.phone}.`);
    } catch (err) {
        console.error(err);
    }
}


const updateAddressContact = async(number: string, address: Address)=> {
    try {
        const updateAddressQuery: string = "UPDATE addresses SET contact = $1 WHERE id = $2";
        const updateAddressValues: string[] = [number, await address.getDbId()];
        await query(updateAddressQuery, updateAddressValues)

        //console.log(`Update address contact of ${address.formattedAddress} with this number: ${number}`);
    } catch (err) {
        console.error(err);
    }
}


const updateAddressOpenTill = async(openTill: string, address: Address)=> {
    try {
        const updateAddressQuery: string = "UPDATE addresses SET open_till = $1 WHERE id = $2";
        const updateAddressValues: string[] = [openTill + ':00', await address.getDbId()];
        await query(updateAddressQuery, updateAddressValues)
    } catch (err) {
        console.error(err);
    }
}

export { updateAddressOpenTill, updateAddressContact, updateCustomerLastUsedAddresses, getAddressById, AddressInDb, getAddressByValues, createLastUsedAddressAndUpdateCustomer, getLastUsedAddresses, getCustomersAddress, createAddressAndUpdateCustomer }