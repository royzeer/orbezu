// Repositorio en memoria para las pruebas (misma interfaz que repo.js).
function memoryRepo() {
  const users = new Map()
  const progress = new Map()
  let nextId = 1
  return {
    users,
    progress,
    async findByEmail(email) {
      return [...users.values()].find((u) => u.email === email) || null
    },
    async findById(id) {
      return users.get(id) || null
    },
    async findByGoogleId(gid) {
      return [...users.values()].find((u) => u.googleId === gid) || null
    },
    async createUser({ email, name, passwordHash = null, googleId = null, avatarUrl = null }) {
      const u = { id: nextId++, email, name, passwordHash, googleId, avatarUrl, remindersEnabled: true, lastReminderAt: null }
      users.set(u.id, u)
      return u
    },
    async updateUser(id, patch) {
      const u = { ...users.get(id), ...patch }
      users.set(id, u)
      return u
    },
    async deleteUser(id) {
      users.delete(id)
      progress.delete(id)
    },
    async getProgress(userId) {
      return progress.get(userId) || { data: null, updatedAt: null }
    },
    async saveProgress(userId, data) {
      progress.set(userId, { data, updatedAt: new Date() })
    },
    async reminderCandidates() {
      return [...users.values()].filter((u) => u.remindersEnabled && progress.has(u.id)).map((u) => ({ ...u, progress: progress.get(u.id).data }))
    },
    async ping() {}
  }
}

module.exports = { memoryRepo }
