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


        // Create the customers table without foreign key constraint
        await query(`CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) UNIQUE NOT NULL,
      name TEXT,
      address UUID,
      last_used_addresses UUID[],
      has_ordered_before BOOLEAN DEFAULT FALSE
    );`);

        // Create the addresses table without foreign key constraint
        await query(`CREATE TABLE IF NOT EXISTS addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      maker UUID,
      contact VARCHAR(20),
      open_till TIME,
      formatted TEXT,
      city VARCHAR(100),
      street VARCHAR(100),
      street_nm VARCHAR(100),
      lat VARCHAR(20),
      lng VARCHAR(20),
      postal_code TEXT,
      city_id TEXT,
      district TEXT
    );`);

        // Add foreign key constraints to customers and addresses
        await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'fk_customers_address'
        ) THEN
          ALTER TABLE customers ADD CONSTRAINT fk_customers_address FOREIGN KEY (address) REFERENCES addresses(id);
        END IF;
      END $$;
    `);
        await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'fk_addresses_maker'
        ) THEN
          ALTER TABLE addresses ADD CONSTRAINT fk_addresses_maker FOREIGN KEY (maker) REFERENCES customers(id);
        END IF;
      END $$;
    `);


        // Create the reviews table
        await query(`CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      grade FLOAT,
      comment TEXT      
    );`);


        // Create the couriers table
        await query(`CREATE TABLE IF NOT EXISTS couriers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) UNIQUE NOT NULL,
      active_orders VARCHAR(20)[],
      completed_orders VARCHAR(20)[],
      area TEXT[],
      grade FLOAT,
      reviews UUID[]
    );`);


        // Create the orders table
        await query(`CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(20) PRIMARY KEY,
      package_size TEXT,
      pickup_date TIMESTAMP,
      dropoff_date TIMESTAMP,
      price_for_customer INTEGER,
      price_for_courier INTEGER,
      customer UUID REFERENCES customers(id),
      courier UUID REFERENCES couriers(id),
      pickup_address UUID REFERENCES addresses(id),
      dropoff_address UUID REFERENCES addresses(id),
      is_intercity BOOLEAN DEFAULT FALSE,
      order_received_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      comments TEXT,
      status VARCHAR(20)
    );`);


        // Create the completed_orders table
        await query(`CREATE TABLE IF NOT EXISTS completed_orders (
      id VARCHAR(20) PRIMARY KEY,
      final_comment TEXT,
      price_for_customer INTEGER,
      price_for_courier INTEGER,
      customer UUID REFERENCES customers(id),
      pickup_address UUID REFERENCES addresses(id),
      dropoff_address UUID REFERENCES addresses(id),
      courier UUID REFERENCES couriers(id),
      is_intercity BOOLEAN DEFAULT FALSE,
      order_received_in TIMESTAMP,
      delivered_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      comments TEXT
    );`);


        // Add foreign key constraints to completed orders, orders, and couriers
        // Currently commented out due to problem with enforcing such constraints on arrays
    //     await query(`
    //   DO $$
    //   BEGIN
    //     IF NOT EXISTS (
    //       SELECT 1
    //       FROM pg_constraint
    //       WHERE conname = 'fk_courier_orders'
    //     ) THEN
    //       ALTER TABLE couriers ADD CONSTRAINT fk_courier_orders FOREIGN KEY (active_orders) REFERENCES orders(id);
    //     END IF;
    //   END $$;
    // `);
    //     await query(`
    //   DO $$
    //   BEGIN
    //     IF NOT EXISTS (
    //       SELECT 1
    //       FROM pg_constraint
    //       WHERE conname = 'fk_courier_completed_orders'
    //     ) THEN
    //       ALTER TABLE couriers ADD CONSTRAINT fk_courier_completed_orders FOREIGN KEY (completed_orders) REFERENCES completed_orders(id);
    //     END IF;
    //   END $$;
    // `);


        // Create the courier_groups table
        await query(`CREATE TABLE IF NOT EXISTS courier_groups (
      serialized_id TEXT PRIMARY KEY,
      tags TEXT[][]
    );`);


        // Create the ad_timers table
        await query(`CREATE TABLE IF NOT EXISTS ad_timers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      advertise_time TIMESTAMP,
      order_to_advertise VARCHAR(20) REFERENCES orders(id)
    );`)


        console.log('Tables created successfully');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
}

const startupUUIDExtention = () => {
    query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
}

export {deleteTables, createTables, startupUUIDExtention}