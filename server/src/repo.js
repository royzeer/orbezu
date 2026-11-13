// Acceso a datos con MySQL. La app recibe este objeto, asi las pruebas
// pueden usar una version en memoria.

const toUser = (r) =>
  r && {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    googleId: r.google_id,
    avatarUrl: r.avatar_url,
    remindersEnabled: !!r.reminders_enabled,
    lastReminderAt: r.last_reminder_at
  }

const parse = (v) => {
  if (v == null) return null
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  return v
}

function mysqlRepo(pool) {
  const one = async (sql, params) => {
    const [rows] = await pool.query(sql, params)
    return rows[0]
  }
  return {
    async findByEmail(email) {
      return toUser(await one('SELECT * FROM users WHERE email = ?', [email]))
    },
    async findById(id) {
      return toUser(await one('SELECT * FROM users WHERE id = ?', [id]))
    },
    async findByGoogleId(gid) {
      return toUser(await one('SELECT * FROM users WHERE google_id = ?', [gid]))
    },
    async createUser({ email, name, passwordHash = null, googleId = null, avatarUrl = null }) {
      const [r] = await pool.query('INSERT INTO users (email, name, password_hash, google_id, avatar_url) VALUES (?, ?, ?, ?, ?)', [email, name, passwordHash, googleId, avatarUrl])
      return this.findById(r.insertId)
    },
    async updateUser(id, patch) {
      const cols = { name: 'name', googleId: 'google_id', avatarUrl: 'avatar_url', remindersEnabled: 'reminders_enabled', lastReminderAt: 'last_reminder_at', passwordHash: 'password_hash' }
      const sets = []
      const vals = []
      for (const [k, v] of Object.entries(patch)) {
        if (!cols[k]) continue
        sets.push(`${cols[k]} = ?`)
        vals.push(k === 'remindersEnabled' ? (v ? 1 : 0) : v)
      }
      if (sets.length) await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...vals, id])
      return this.findById(id)
    },
    async deleteUser(id) {
      await pool.query('DELETE FROM users WHERE id = ?', [id])
    },
    async getProgress(userId) {
      const r = await one('SELECT data, updated_at FROM progress WHERE user_id = ?', [userId])
      return r ? { data: parse(r.data), updatedAt: r.updated_at } : { data: null, updatedAt: null }
    },
    async saveProgress(userId, data) {
      await pool.query('INSERT INTO progress (user_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [userId, JSON.stringify(data)])
    },
    async reminderCandidates() {
      const [rows] = await pool.query(
        'SELECT u.*, p.data AS progress_data FROM users u JOIN progress p ON p.user_id = u.id WHERE u.reminders_enabled = 1 AND (u.last_reminder_at IS NULL OR u.last_reminder_at < CURDATE())'
      )
      return rows.map((r) => ({ ...toUser(r), progress: parse(r.progress_data) }))
    },
    async ping() {
      await pool.query('SELECT 1')
    }
  }
}

module.exports = { mysqlRepo }
