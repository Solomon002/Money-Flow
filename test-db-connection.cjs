require('dotenv').config()
const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function testConnection() {
  try {
    await client.connect()

    const result = await client.query('SELECT NOW() AS current_time')

    console.log('Database connection successful!')
    console.log('PostgreSQL time:', result.rows[0].current_time)
  } catch (error) {
    console.error('Database connection failed:')
    console.error(error.message)
  } finally {
    await client.end()
  }
}

testConnection()