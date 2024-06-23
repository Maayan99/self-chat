import {User} from "../classes/user";
import {query} from "./db";

/**
 * Inserts a new customer into the customers table.
 * @async
 * @function insertCustomer
 * @param {string} phone - The customer object.
 * @returns {Promise<void>} A Promise that resolves when the customer is inserted successfully.
 */
async function insertCustomer(phone: string): Promise<void> {
    try {
        await query(`
      INSERT INTO customers (phone)
      VALUES ($1)
    `, [phone]);
    } catch (err) {
        console.error('Error inserting customer:', err);
    }
}

const getCustomer = async (phone: string): Promise<User | null> => {
    const response = await query('SELECT * FROM customers WHERE phone = $1', [phone])
    const row = response.rows[0]

    if (row) {
        // Keeping lastUsedAddresses null so they can be fetched later on
        return new User(phone, row.address, row.id, null, row.has_ordered_before, row.name)
    } else {
        return null
    }
}

const getCustomerById = async (id: string): Promise<User | null> => {
    const response = await query('SELECT * FROM customers WHERE id = $1', [id])
    const row = response.rows[0]

    if (row) {
        // Keeping lastUsedAddresses null so they can be fetched later on
        return new User(row.phone, row.address, row.id, null, row.has_ordered_before, row.name)
    } else {
        return null
    }
}

const updateCustomerToHavingOrderBefore = async (customer: User): Promise<void> => {
    const id = await customer.getDbId()
    await query('UPDATE customers SET has_ordered_before = true WHERE id = $1', [id])
}

const deleteCustomer = async(number: string): Promise<void> => {
    const response =  await query('DELETE FROM customers WHERE number = $1', [number])
}

async function getAllCustomers(): Promise<User[]> {
    try {
        const queryString: string = 'SELECT * FROM customers'
        const response = await query(queryString, [])

        return response.rows?.map((row: any) => new User(row.phone, row.address, row.id, null, row.has_ordered_before, row.name)) || [];
    } catch (e) {
        console.log(e)
        return []
    }
}


async function updateCustomerName(firstName: string, lastName: string, customer: User) {
    try {
        const queryString: string = 'UPDATE customers SET name = $1 WHERE id = $2'
        const queryVars: string[] = [`${firstName} ${lastName}`, await customer.getDbId()]
        await query(queryString, queryVars);
    } catch (e) {
        console.log(e)
    }
}


export { updateCustomerName, getAllCustomers, updateCustomerToHavingOrderBefore, getCustomerById, deleteCustomer, getCustomer, insertCustomer }