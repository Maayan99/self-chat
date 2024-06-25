import {query} from "./db";

const deleteTables = async () => {
    try {
        await query('DROP TABLE IF EXISTS entry_fields CASCADE');
        await query('DROP TABLE IF EXISTS category_entries CASCADE');
        await query('DROP TABLE IF EXISTS notes CASCADE');
        await query('DROP TABLE IF EXISTS contacts CASCADE');
        await query('DROP TABLE IF EXISTS links CASCADE');
        await query('DROP TABLE IF EXISTS fields CASCADE');
        await query('DROP TABLE IF EXISTS categories CASCADE');
        await query('DROP TABLE IF EXISTS users CASCADE');

        console.log('Tables deleted successfully');
    } catch (err) {
        console.error('Error deleting tables', err);
    }
}


/**
 * Creates the necessary tables the bot.
 * @async
 * @function createTables
 * @returns {Promise<void>} A Promise that resolves when all tables are created successfully.
 */
const createTables = async (): Promise<void> => {
    try {
        await query(`SET TIME ZONE 'Asia/Jerusalem';`)
        const res = await query(`SELECT NOW();`);
        console.log("Set time zone. Current time: ", res.rows[0].now);

// Create the users table
        await query(`CREATE TABLE IF NOT EXISTS users (
      user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number VARCHAR(15) UNIQUE NOT NULL,
      plan VARCHAR(15) DEFAULT 'regular'
    );`);

        // Create the links table
        await query(`CREATE TABLE IF NOT EXISTS links (
      link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      url TEXT NOT NULL,
      extra_text TEXT,
      tags TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        // Create the contacts table
        await query(`CREATE TABLE IF NOT EXISTS contacts (
      contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      phone_number VARCHAR(15),
      tags TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        // Create the notes table
        await query(`CREATE TABLE IF NOT EXISTS notes (
      note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      note_text TEXT NOT NULL,
      tags TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        console.log('Tables created successfully');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
}

const startupUUIDExtention = () => {
    query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
}

export {deleteTables, createTables, startupUUIDExtention}