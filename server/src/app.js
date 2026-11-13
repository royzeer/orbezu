const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { runReminders } = require('./reminders')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  avatarUrl: u.avatarUrl,
  remindersEnabled: u.remindersEnabled,
  hasPassword: !!u.passwordHash,
  hasGoogle: !!u.googleId
})

/** Compara el origen con CLIENT_ORIGIN. Acepta comodines, por ejemplo https://orbezu*.vercel.app */
function allowOrigin(origin, list) {
  const clean = (u) => u.trim().replace(/\/+$/, '').toLowerCase()
  const o = clean(origin)
  return list.some((entry) => {
    const e = clean(entry)
    if (!e.includes('*')) return e === o
    const re = new RegExp('^' + e.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]*') + '$')
    return re.test(o)
  })
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Crea la app de Express.
 * deps: repo (datos), mailer (correos), verifyGoogle (valida el ID token de Google), config.
 */
function createApp({ repo, mailer, verifyGoogle, config }) {
  if (!config.jwtSecret) throw new Error('Falta JWT_SECRET')
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      origin: (origin, cb) => {
        const ok = !origin || allowOrigin(origin, config.clientOrigins)
        if (!ok) console.warn(`[cors] Origen rechazado: ${origin}. Agregalo a CLIENT_ORIGIN.`)
        cb(null, ok)
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )
  app.use(express.json({ limit: '1mb' }))

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.authRateLimit || 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Espera unos minutos.' } })

  const sign = (user) => jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '30d' })
  const session = (user) => ({ token: sign(user), user: publicUser(user) })

  const requireAuth = async (req, _res, next) => {
    const h = req.get('authorization') || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (!token) throw new HttpError(401, 'Inicia sesión para continuar.')
    let payload
    try {
      payload = jwt.verify(token, config.jwtSecret)
    } catch {
      throw new HttpError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.')
    }
    const user = await repo.findById(Number(payload.sub))
    if (!user) throw new HttpError(401, 'La cuenta ya no existe.')
    req.user = user
    next()
  }

  // La raiz de la API no es la app: lleva a la app publicada (Vercel).
  app.get('/', (_req, res) => {
    if (config.appUrl && !config.appUrl.includes('localhost')) return res.redirect(config.appUrl)
    res.json({ ok: true, message: 'Esta es la API de Orbezu. La app se abre desde el frontend (Vercel).' })
  })

  app.get('/api/health', async (_req, res) => {
    let db = 'ok'
    try {
      await repo.ping()
    } catch {
      db = 'error'
    }
    res.json({ ok: true, db })
  })

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const name = String(req.body?.name || '').trim().slice(0, 80)
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Escribe un correo válido.')
    if (password.length < 8 || password.length > 200) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres.')
    if (!name) throw new HttpError(400, 'Escribe tu nombre.')
    if (await repo.findByEmail(email)) throw new HttpError(409, 'Ya existe una cuenta con ese correo.')
    const user = await repo.createUser({ email, name, passwordHash: await bcrypt.hash(password, 10) })
    mailer.welcome(user).catch((e) => console.error('[correo]', e.message))
    res.status(201).json(session(user))
  })

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const user = email ? await repo.findByEmail(email) : null
    if (user && !user.passwordHash && user.googleId) throw new HttpError(400, 'Esta cuenta se creó con Google. Usa el botón de Google.')
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Correo o contraseña incorrectos.')
    res.json(session(user))
  })

  app.post('/api/auth/google', authLimiter, async (req, res) => {
    if (!config.googleClientId) throw new HttpError(503, 'El inicio de sesión con Google no está configurado.')
    const credential = String(req.body?.credential || '')
    if (!credential) throw new HttpError(400, 'Falta la credencial de Google.')
    let g
    try {
      g = await verifyGoogle(credential)
    } catch {
      throw new HttpError(401, 'Google no pudo confirmar tu identidad.')
    }
    if (!g?.sub || !g.email || g.email_verified === false) throw new HttpError(401, 'Tu correo de Google no está verificado.')
    const email = g.email.toLowerCase()
    let user = await repo.findByGoogleId(g.sub)
    let created = false
    if (!user) {
      const byEmail = await repo.findByEmail(email)
      if (byEmail) user = await repo.updateUser(byEmail.id, { googleId: g.sub, avatarUrl: byEmail.avatarUrl || g.picture || null })
      else {
        user = await repo.createUser({ email, name: (g.name || '').slice(0, 80) || null, googleId: g.sub, avatarUrl: g.picture || null })
        created = true
      }
    }
    if (created) mailer.welcome(user).catch((e) => console.error('[correo]', e.message))
    res.status(created ? 201 : 200).json(session(user))
  })

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

  app.patch('/api/auth/me', requireAuth, async (req, res) => {
    const patch = {}
    if (typeof req.body?.remindersEnabled === 'boolean') patch.remindersEnabled = req.body.remindersEnabled
    if (typeof req.body?.name === 'string' && req.body.name.trim()) patch.name = req.body.name.trim().slice(0, 80)
    const user = await repo.updateUser(req.user.id, patch)
    res.json({ user: publicUser(user) })
  })

  app.delete('/api/auth/me', requireAuth, async (req, res) => {
    await repo.deleteUser(req.user.id)
    res.status(204).end()
  })

  app.get('/api/progress', requireAuth, async (req, res) => {
    res.json(await repo.getProgress(req.user.id))
  })

  app.put('/api/progress', requireAuth, async (req, res) => {
    const data = req.body?.data
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.lessons !== 'object' || typeof data.reviews !== 'object') {
      throw new HttpError(400, 'Progreso con formato inválido.')
    }
    await repo.saveProgress(req.user.id, data)
    res.json({ ok: true })
  })

  // Permite lanzar los recordatorios desde fuera (por ejemplo, GitHub Actions).
  app.post('/api/cron/reminders', async (req, res) => {
    if (!config.cronSecret || req.get('x-cron-secret') !== config.cronSecret) throw new HttpError(401, 'No autorizado.')
    res.json(await runReminders({ repo, mailer }))
  })

  app.use((_req, res) => res.status(404).json({ error: 'No encontrado.' }))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Los datos son demasiado grandes.' })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' })
    const status = err.status || 500
    if (status >= 500) console.error(err)
    res.status(status).json({ error: status >= 500 ? 'Algo salió mal en el servidor.' : err.message })
  })

  return app
}

module.exports = { createApp, publicUser, allowOrigin }
