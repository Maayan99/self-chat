import {query} from "./db";

const deleteTables = async () => {
    await query('DROP TABLE if exists customers CASCADE')
    await query('DROP TABLE if exists addresses CASCADE')
    await query('DROP TABLE if exists reviews CASCADE')
    await query('DROP TABLE if exists couriers CASCADE')
    await query('DROP TABLE if exists orders CASCADE')
    await query('DROP TABLE if exists completed_orders CASCADE')
    await query('DROP TABLE if exists courier_groups CASCADE')
    await query('DROP TABLE if exists ad_timers CASCADE')
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
    );`);

        // Create the categories table
        await query(`CREATE TABLE IF NOT EXISTS categories (
      category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      category_name VARCHAR(100) NOT NULL
    );`);

        // Create the fields table
        await query(`CREATE TABLE IF NOT EXISTS fields (
      field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES categories(category_id),
      field_name VARCHAR(100) NOT NULL
    );`);

        // Create the links table
        await query(`CREATE TABLE IF NOT EXISTS links (
      link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      url TEXT NOT NULL,
      extra_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        // Create the contacts table
        await query(`CREATE TABLE IF NOT EXISTS contacts (
      contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      contact_name VARCHAR(100),
      phone_number VARCHAR(15),
      email VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        // Create the notes table
        await query(`CREATE TABLE IF NOT EXISTS notes (
      note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(user_id),
      note_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        // Create the category_entries table
        await query(`CREATE TABLE IF NOT EXISTS category_entries (
      entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES categories(category_id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

        // Create the entry_fields table
        await query(`CREATE TABLE IF NOT EXISTS entry_fields (
      entry_field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_id UUID NOT NULL REFERENCES category_entries(entry_id),
      field_id UUID NOT NULL REFERENCES fields(field_id),
      field_value TEXT NOT NULL
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