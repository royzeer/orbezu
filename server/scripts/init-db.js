// Crea las tablas de Orbezu. Uso: npm run db:init
require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const { createPool } = require('../src/db')

async function main() {
  // En XAMPP la base de datos puede no existir todavia: la creamos.
  if (!process.env.DATABASE_URL) {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    })
    const name = (process.env.DB_NAME || 'orbezu').replace(/[^a-zA-Z0-9_]/g, '')
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await conn.end()
  }
  const pool = createPool()
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8')
  for (const stmt of sql.split(';').map((s) => s.replace(/--.*$/gm, '').trim()).filter(Boolean)) {
    await pool.query(stmt)
  }
  await pool.end()
  console.log('Tablas listas.')
}

main().catch((e) => {
  console.error('No se pudo crear el esquema:', e.message)
  process.exit(1)
})
