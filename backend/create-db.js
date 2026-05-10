const { Client } = require('pg');

const createDb = async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres' // connect to default db first
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='neurodesk'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE neurodesk');
      console.log("Database 'neurodesk' created successfully.");
    } else {
      console.log("Database 'neurodesk' already exists.");
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    await client.end();
  }
};

createDb();
