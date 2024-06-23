import {Order, OrderStatus, PackageSize} from "../classes/order/order";
import {query} from "./db";
import {OrderFactory} from "../classes/order/order-factory";
import {formatDateForDb} from "../utility/date-utility";
import {Courier} from "../classes/courier";
import {Customer} from "../classes/customer";
import {CompletedOrder} from "../classes/order/completed-order";
import * as console from "console";
import e from "express";
import {DeliveryDate} from "../utility/classes/delivery-date";
import {notifyAdminsError} from "../utility/admin-notifs-utility";


/**
 * Represents an order in the database.
 *
 * @typedef {Object} OrderInDb
 * @property {string} id - The unique identifier of the order.
 * @property {string} package_size - The size of the package for the order.
 * @property {Date} pickup_date - The date on which the pickup is scheduled.
 * @property {Date} dropoff_date - The date on which the drop-off is scheduled.
 * @property {number} price_for_customer - The price of the order for the customer.
 * @property {number} price_for_courier - The price of the order for the courier.
 * @property {string} customer - The name of the customer who placed the order.
 * @property {string} [courier] - The name of the courier assigned to the order (Optional).
 * @property {string} pickup_address - The address from which the package needs to be picked up.
 * @property {string} dropoff_address - The address where the package needs to be dropped off.
 * @property {boolean} is_intercity - Indicates whether the order is intercity or not.
 * @property {string} order_received_in - The location where the order was received.
 * @property {string} comments - Additional comments or instructions for the order.
 * @property {string} status - The current status of the order.
 */
type OrderInDb = {
    id: string,
    package_size: PackageSize,
    pickup_date: string,
    dropoff_date: string,
    price_for_customer: number,
    price_for_courier: number,
    customer: string,
    courier?: string,
    pickup_address: string,
    dropoff_address: string,
    is_intercity: boolean,
    order_received_in: string,
    comments: string,
    status: OrderStatus
}


/**
 * Adds an active order to the database.
 *
 * @param {Order} order - The order to be added to the database.
 * @returns {string} - The order received in timestamp of the added order.
 * @throws {Error} - If the order cannot be added to the database.
 */
async function addActiveOrderToDb(order: Order) {
    try {
        const orderForDb: OrderInDb = await order.getDbObject();
        const id: string = orderForDb.id
        const packageSize: string = orderForDb.package_size
        const pickUpDate: string = orderForDb.pickup_date
        const dropOffDate: string = orderForDb.dropoff_date
        const priceForCustomer: number = orderForDb.price_for_customer
        const priceForCourier: number = orderForDb.price_for_courier
        const customer: string = orderForDb.customer
        const pickUpAddress: string = orderForDb.pickup_address
        const dropOffAddress: string = orderForDb.dropoff_address
        const is_intercity: boolean = orderForDb.is_intercity
        const comments: string = orderForDb.comments
        const status: string = orderForDb.status

        const queryString: string = 'INSERT INTO orders (id, package_size, pickup_date, dropoff_date,' +
            'price_for_customer, customer, pickup_address, dropoff_address, is_intercity, comments, status, price_for_courier) VALUES' +
            '($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING order_received_in'

        const queryVars = [id, packageSize, pickUpDate, dropOffDate, priceForCustomer,
            customer, pickUpAddress, dropOffAddress, is_intercity, comments, status, priceForCourier]

        const result = await query(queryString, queryVars)

        return result.rows[0].order_received_in
    } catch(e) {
        notifyAdminsError("לא הצלחתי להוסיף הזמנה לדאטהבייס עם השגיאה הבאה: \n" + e);
        console.error("Couldn't add order to db, got error ", e)
    }
}




/**
 * Retrieves an order by its id.
 *
 * @param {string} id - The id of the order.
 * @returns {Promise<Order | null>} - A promise that resolves to the order if it exists, or null if it does not.
 */
async function getOrderById(id: string): Promise<Order | null> {
    const queryString: string = 'SELECT * FROM orders WHERE id = $1'
    const queryVars = [id]
    const queryResults = await query(queryString, queryVars);

    if (queryResults.rows && queryResults.rows.length > 0) {
        return OrderFactory.createFromDb(queryResults.rows[0])
    } else {
        return null
    }
}


async function getAllActiveOrdersOfCustomer(customer: Customer): Promise<Order[]> {
    try {
        const queryString: string = 'SELECT * FROM orders WHERE customer = $1'
        const queryVars = [await customer.getDbId()]
        const queryResults = await query(queryString, queryVars);
        if (queryResults.rows && queryResults.rows.length > 0) {
            return await Promise.all(queryResults.rows.map(async row => await OrderFactory.createFromDb(row)));
        } else {
            return []
        }
    } catch (e) {
        console.error("Error occurred while getting all active orders of customer: ", e);
        return []
    }
}


/**
 * Sets the assigned courier for an order in the database. Updates status and price for couriers too.
 *
 * @param {Order} order - The order for which the courier needs to be assigned.
 * @param {Courier} courier - The courier to be assigned to the order.
 *
 * @return {Promise<void>} - A promise that resolves once the database update is complete.
 */
async function setAssignedCourierInDb(order: Order,  courier: Courier) {
    const queryString: string = 'UPDATE orders SET courier = $1, status = $3, price_for_courier = $4 WHERE id = $2'
    const queryVars = [await courier.getDbId(), order.getId(), OrderStatus.FoundCourier, order.getPriceForCourier()]
    await query(queryString, queryVars)
}

async function updatePriceForCouriers(order: Order) {
    try {
        const queryString: string = 'UPDATE orders SET price_for_courier = $2 WHERE id = $1'
        const queryVars = [order.getId(), order.getPriceForCourier()]
        await query(queryString, queryVars)
    } catch (e) {
        console.log(e)
    }
}


async function updateOrderStatus(order: Order, status: OrderStatus) {
    try {
        const queryString: string = 'UPDATE orders SET status = $1 WHERE id = $2'
        const queryVars = [status, order.getId()]
        await query(queryString, queryVars)
    } catch (e) {
        console.log(e)
    }
}


async function deleteOrderFromActiveOrderTable(order: Order) {
    try {
        // First, remove the order from the active orders table
        const deleteQueryString: string = 'DELETE FROM orders WHERE id = $1';
        const deleteQueryVars = [order.getId()];
        await query(deleteQueryString, deleteQueryVars);
    } catch (e) {
        console.log(e)
    }

}


export { getAllActiveOrdersOfCustomer, updatePriceForCouriers, deleteOrderFromActiveOrderTable, updateOrderStatus, setAssignedCourierInDb, addActiveOrderToDb, getOrderById, OrderInDb }