import {query} from "./db";
import {Courier} from "../classes/courier";
import {Order} from "../classes/order/order";
import * as dbOrders from "./db-orders";
import * as console from "console";
import {paidOrders} from "../main";


async function createNewCourier(phone: string) {
    try {
        const queryStr: string = 'INSERT INTO couriers (phone) values ($1) RETURNING id'
        const values = [phone]
        const result = await query(queryStr, values)

        return result.rows[0].id
    } catch (e) {
        console.log(e)
    }
}



async function fetchActiveOrdersById(activeOrderIds: string[] | undefined): Promise<Order[]> {
    const activeOrders: Order[] = []
    if (activeOrderIds) {
        for (let i = 0; i < activeOrderIds.length; i++) {
            const orderId = activeOrderIds[i]
            const order: Order | null = paidOrders.find(order => order.getId() === orderId) ||
                await dbOrders.getOrderById(orderId)
            if (order) {
                activeOrders.push(order)
            }
        }
    }

    return activeOrders
}


/**
 * Retrieves a courier by phone number
 *
 * @param {string} phone - The phone number of the courier
 * @returns {Promise<Courier>} The courier object with matching phone number and active orders
 */
async function getCourierByPhone(phone: string): Promise<Courier | undefined> {
    try {
        console.log("Fetching courier by phone, ", phone)
        const queryStr: string = 'SELECT * FROM couriers WHERE phone = $1'
        const values = [phone]
        const result = await query(queryStr, values)
        //const activeOrders = await fetchActiveOrdersById(result.rows[0].active_orders)
        return new Courier(result.rows[0].phone, result.rows[0].id)
    } catch (e) {
        console.log(e)
    }
}


async function getCourierById(id: string) {
    try {
        const queryStr: string = 'SELECT * FROM couriers WHERE id = $1'
        const values = [id]
        const result = await query(queryStr, values)
        //const activeOrders = await fetchActiveOrdersById(result.rows[0].active_orders)
        return new Courier(result.rows[0].phone, result.rows[0].id)
    } catch (e) {
        console.log(e)
    }
}

async function getCourierActiveOrders(courier: Courier): Promise<Order[] | undefined> {
    try {
        const courierQueryStr: string = 'SELECT * FROM couriers WHERE id = $1'
        const courierValues = [await courier.getDbId()]
        const result = await query(courierQueryStr, courierValues)

        return await fetchActiveOrdersById(result.rows[0].active_orders);
    } catch (e) {
        console.log(e)
    }
}

async function addActiveOrderToCourierDb(courier: Courier, order: Order) {
    try {
        const queryStr: string = 'UPDATE couriers SET active_orders = array_append(active_orders, $2) WHERE id = $1 RETURNING *'
        const values = [await courier.getDbId(), order.getId()]
        const result = await query(queryStr, values)

        return true
    } catch (e) {
        console.log(e)
        return false
    }
}


async function setActiveOrderAsCompletedForCourier(courier: Courier, order: Order) {
    try {
        const trackingNumber: string = order.getId()

        const queryStr: string = 'UPDATE couriers SET active_orders = array_remove(active_orders, $2), completed_orders = array_append(completed_orders, $2) WHERE id = $1 RETURNING *'
        const values = [await courier.getDbId(), trackingNumber]
        const result = await query(queryStr, values)

        return true
    } catch (e) {
        console.log(e)
        return false
    }
}


async function getAllCouriers(): Promise<Courier[]> {
    try {
        const queryString = 'SELECT * FROM couriers'
        const result = await query(queryString);
        return result.rows.map(row => new Courier(row.phone, row.id));
    } catch (e) {
        console.log(e)
        return []
    }
}

export {
    getAllCouriers,
    getCourierActiveOrders,
    setActiveOrderAsCompletedForCourier,
    addActiveOrderToCourierDb,
    createNewCourier,
    getCourierByPhone,
    getCourierById
}