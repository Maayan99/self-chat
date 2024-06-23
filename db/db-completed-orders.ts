import {Order} from "../classes/order/order";
import {query} from "./db";
import {CompletedOrder} from "../classes/order/completed-order";
import {Customer} from "../classes/customer";
import {OrderFactory} from "../classes/order/order-factory";


type CompletedDbOrder = {
    id: string,
    final_comment: string,
    price_for_customer: number,
    price_for_courier: number,
    customer: string,
    courier: string,
    pickup_address: string,
    dropoff_address: string,
    is_intercity: boolean,
    order_received_in: string,
    delivered_in: string,
    comments: string,
}


async function addCompletedOrderToDb(order: Order) {
    try {
        const completedDbOrder: CompletedDbOrder = await order.generateCompletedOrderObject()

        const id: string = completedDbOrder.id
        const finalComment: string = completedDbOrder.final_comment
        const priceForCustomer: number = completedDbOrder.price_for_customer
        const priceForCourier: number = completedDbOrder.price_for_courier
        const customer: string = completedDbOrder.customer
        const courier: string = completedDbOrder.courier
        const pickUpAddress: string = completedDbOrder.pickup_address
        const dropOffAddress: string = completedDbOrder.dropoff_address
        const is_intercity: boolean = completedDbOrder.is_intercity
        const order_received_in: string = completedDbOrder.order_received_in
        const comments: string = completedDbOrder.comments
        const queryString: string = 'INSERT INTO completed_orders (id, final_comment, price_for_customer, price_for_courier, ' +
            'customer, courier, pickup_address, dropoff_address, is_intercity, order_received_in, comments) VALUES' +
            '($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING order_received_in'

        const queryVars = [id, finalComment, priceForCustomer, priceForCourier,
            customer, courier, pickUpAddress, dropOffAddress, is_intercity, order_received_in, comments]

        const result = await query(queryString, queryVars)
    } catch (e) {
        console.log(e)
    }
}


async function getAllCompletedOrdersOfCustomer(customer: Customer): Promise<CompletedOrder[]> {
    try {
        const queryString: string = 'SELECT * FROM completed_orders WHERE customer = $1';
        const queryVars: string[] = [await customer.getDbId()];

        const ordersResp = await query(queryString, queryVars);
        const orders: CompletedDbOrder[] | undefined = ordersResp.rows
        if (!orders) { // If there are no orders, return an empty array
            return []
        }

        // Else, map the orders to completed order objects
        return await
            Promise.all(orders.map(
                async (order: CompletedDbOrder) => await OrderFactory.createCompletedOrderFromDb(order))
            );
    } catch (e) {
        console.log(e)
        return []
    }
}





export { getAllCompletedOrdersOfCustomer, CompletedDbOrder, addCompletedOrderToDb }