require('dotenv').config({ quiet: true })

const list = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

module.exports = {
  port: Number(process.env.PORT) || 4000,
  clientOrigins: list(process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
  jwtSecret: process.env.JWT_SECRET || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Orbezu <onboarding@resend.dev>',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  reminderCron: process.env.REMINDER_CRON || '0 9 * * *',
  reminderTz: process.env.REMINDER_TZ || 'America/Lima',
  cronSecret: process.env.CRON_SECRET || ''
}
