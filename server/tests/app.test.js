const request = require('supertest')
const { createApp } = require('../src/app')
const { countDue, runReminders } = require('../src/reminders')
const { memoryRepo } = require('./memoryRepo')

const config = { jwtSecret: 'test-secret', googleClientId: 'test-client', clientOrigins: ['http://localhost:5173'], cronSecret: 'cron', authRateLimit: 1000 }

function setup() {
  const repo = memoryRepo()
  const sent = []
  const mailer = {
    welcome: async (u) => sent.push(['welcome', u.email]),
    reminder: async (u, n) => sent.push(['reminder', u.email, n])
  }
  const verifyGoogle = async (token) => {
    if (token === 'bad') throw new Error('invalid')
    return { sub: 'g-123', email: 'ana@example.com', email_verified: true, name: 'Ana', picture: 'https://example.com/a.png' }
  }
  const app = createApp({ repo, mailer, verifyGoogle, config })
  return { app, repo, sent }
}

const progress = (due) => ({ lessons: { 'en-bakery': { step: 5 } }, reviews: { a: { id: 'a', due }, b: { id: 'b', due: Date.now() + 9e9 } }, stats: {}, updatedAt: 1 })

describe('registro e inicio de sesión', () => {
  test('registra, guarda la contraseña cifrada y envía bienvenida', async () => {
    const { app, repo, sent } = setup()
    const res = await request(app).post('/api/auth/register').send({ name: 'Leo', email: 'Leo@Example.com', password: 'secreto123' })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user).toMatchObject({ email: 'leo@example.com', name: 'Leo', hasPassword: true })
    expect(res.body.user.passwordHash).toBeUndefined()
    const stored = await repo.findByEmail('leo@example.com')
    expect(stored.passwordHash).not.toBe('secreto123')
    expect(sent).toContainEqual(['welcome', 'leo@example.com'])
  })

  test('rechaza datos inválidos y correos repetidos', async () => {
    const { app } = setup()
    expect((await request(app).post('/api/auth/register').send({ name: 'A', email: 'malo', password: 'secreto123' })).status).toBe(400)
    expect((await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'corta' })).status).toBe(400)
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'secreto123' })
    expect((await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'secreto123' })).status).toBe(409)
  })

  test('inicia sesión solo con la contraseña correcta', async () => {
    const { app } = setup()
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'secreto123' })
    expect((await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'otra-cosa' })).status).toBe(401)
    const ok = await request(app).post('/api/auth/login').send({ email: 'A@B.co', password: 'secreto123' })
    expect(ok.status).toBe(200)
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.token}`)
    expect(me.body.user.email).toBe('a@b.co')
  })

  test('protege las rutas privadas', async () => {
    const { app } = setup()
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
    expect((await request(app).get('/api/progress').set('Authorization', 'Bearer basura')).status).toBe(401)
  })
})

describe('Google', () => {
  test('crea la cuenta la primera vez y la reutiliza después', async () => {
    const { app, repo } = setup()
    const first = await request(app).post('/api/auth/google').send({ credential: 'ok' })
    expect(first.status).toBe(201)
    expect(first.body.user).toMatchObject({ email: 'ana@example.com', hasGoogle: true, hasPassword: false })
    const again = await request(app).post('/api/auth/google').send({ credential: 'ok' })
    expect(again.status).toBe(200)
    expect(repo.users.size).toBe(1)
  })

  test('vincula Google a una cuenta existente con el mismo correo', async () => {
    const { app, repo } = setup()
    await request(app).post('/api/auth/register').send({ name: 'Ana', email: 'ana@example.com', password: 'secreto123' })
    const res = await request(app).post('/api/auth/google').send({ credential: 'ok' })
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ hasGoogle: true, hasPassword: true })
    expect(repo.users.size).toBe(1)
  })

  test('rechaza credenciales inválidas', async () => {
    const { app } = setup()
    expect((await request(app).post('/api/auth/google').send({ credential: 'bad' })).status).toBe(401)
  })
})

describe('progreso y recordatorios', () => {
  test('guarda y devuelve el progreso de cada persona', async () => {
    const { app } = setup()
    const { body } = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'secreto123' })
    const auth = { Authorization: `Bearer ${body.token}` }
    expect((await request(app).put('/api/progress').set(auth).send({ data: [] })).status).toBe(400)
    expect((await request(app).put('/api/progress').set(auth).send({ data: progress(0) })).status).toBe(200)
    const got = await request(app).get('/api/progress').set(auth)
    expect(got.body.data.lessons['en-bakery'].step).toBe(5)
  })

  test('cuenta los repasos vencidos y envía un recordatorio', async () => {
    expect(countDue(progress(0))).toBe(1)
    const { app, repo, sent } = setup()
    const { body } = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'secreto123' })
    await request(app).put('/api/progress').set('Authorization', `Bearer ${body.token}`).send({ data: progress(0) })
    expect((await request(app).post('/api/cron/reminders')).status).toBe(401)
    const res = await request(app).post('/api/cron/reminders').set('x-cron-secret', 'cron')
    expect(res.body).toEqual({ checked: 1, sent: 1 })
    expect(sent).toContainEqual(['reminder', 'a@b.co', 1])
    const r2 = await runReminders({ repo: { ...repo, reminderCandidates: async () => [] }, mailer: {} })
    expect(r2.sent).toBe(0)
  })

  test('permite apagar los recordatorios y borrar la cuenta', async () => {
    const { app, repo } = setup()
    const { body } = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.co', password: 'secreto123' })
    const auth = { Authorization: `Bearer ${body.token}` }
    const off = await request(app).patch('/api/auth/me').set(auth).send({ remindersEnabled: false })
    expect(off.body.user.remindersEnabled).toBe(false)
    expect((await request(app).delete('/api/auth/me').set(auth)).status).toBe(204)
    expect(repo.users.size).toBe(0)
  })
})

describe('raíz de la API', () => {
  test('lleva a la app publicada', async () => {
    const { repo } = setup()
    const app = createApp({ repo, mailer: {}, verifyGoogle: async () => ({}), config: { ...config, appUrl: 'https://orbezu.vercel.app' } })
    const res = await request(app).get('/')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://orbezu.vercel.app')
  })
})
