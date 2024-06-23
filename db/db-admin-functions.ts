// import {formatDateForDb, formatDateWithoutYear, getISTDate} from "../utility/date-utility";
// import {query} from "./db";
// import * as console from "console";
//
// enum Timeframe {
//     SinceStart,
//     Year,
//     Month,
//     Week,
//     Day,
// }
//
// function getDateFromTimeframe(timeframe: Timeframe) {
//     const dateToday = getISTDate();
//
//     switch(timeframe) {
//         case Timeframe.Day:
//             dateToday.setDate(dateToday.getDate() - 1);
//             break;
//         case Timeframe.Week:
//             dateToday.setDate(dateToday.getDate() - 7);
//             break;
//         case Timeframe.Month:
//             dateToday.setMonth(dateToday.getMonth() - 1);
//             break;
//         case Timeframe.Year:
//             dateToday.setFullYear(dateToday.getFullYear() - 1);
//             break;
//         case Timeframe.SinceStart:
//             dateToday.setFullYear(2000) // Set to a time before the bot started running
//     }
//
//     return dateToday;
// }
//
//
//
// async function getCompletedOrdersInTimeframe(timeframe: Timeframe): Promise<CompletedOrder[] | undefined> {
//     try {
//         const date: Date = getDateFromTimeframe(timeframe);
//         const formattedDate = formatDateForDb(date);
//
//         const queryString: string = 'SELECT * FROM completed_orders WHERE delivered_in > $1 ORDER BY delivered_in ASC'
//         const queryVars = [formattedDate]
//         const result = await query(queryString, queryVars);
//         return await Promise.all(result.rows.map((row: CompletedDbOrder) => OrderFactory.createCompletedOrderFromDb(row)));
//     } catch (e) {
//         console.log(e)
//     }
// }
//
//
// async function getProfitReport(timeframe: Timeframe) {
//     try {
//         const orders: CompletedOrder[] = await getCompletedOrdersInTimeframe(timeframe) || []
//
//         let report: { [key: string]: [number, number, number] } = {};
//         for (let order of orders) {
//             let dateKey = formatDateWithoutYear(order.getDeliveredIn());
//             if (!report[dateKey]) {
//                 report[dateKey] = [0, 0, 0];
//             }
//
//             report[dateKey][0] += order.getPriceForCustomer();
//             report[dateKey][1] += order.getPriceForCourier();
//             report[dateKey][2] += order.getPriceForCustomer() - order.getPriceForCourier();
//         }
//
//         return report;
//     } catch (e) {
//         console.log(e)
//     }
// }
//
// export { getCompletedOrdersInTimeframe, getProfitReport }