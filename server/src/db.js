const mysql = require('mysql2/promise')

/** Crea el pool de MySQL. Acepta la Service URI de Aiven o datos sueltos (XAMPP). */
function createPool(env = process.env) {
  let opts
  if (env.DATABASE_URL) {
    const u = new URL(env.DATABASE_URL)
    opts = {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '') || 'defaultdb'
    }
  } else {
    opts = {
      host: env.DB_HOST || '127.0.0.1',
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'orbezu'
    }
  }
  if (env.DB_SSL_CA) {
    opts.ssl = { ca: env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
  } else if (env.DATABASE_URL && /ssl-mode=required/i.test(env.DATABASE_URL)) {
    // Sin CA no se puede validar el certificado de Aiven. Mejor configura DB_SSL_CA.
    opts.ssl = { rejectUnauthorized: false }
    console.warn('[db] Conexion cifrada sin validar el certificado. Configura DB_SSL_CA.')
  }
  return mysql.createPool({ ...opts, waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4' })
}

module.exports = { createPool }
