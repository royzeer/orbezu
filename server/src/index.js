const config = require('./config')
const { createPool } = require('./db')
const { mysqlRepo } = require('./repo')
const { createMailer } = require('./mailer')
const { createApp } = require('./app')
const { scheduleReminders } = require('./reminders')
const { OAuth2Client } = require('google-auth-library')

const googleClient = new OAuth2Client()
const verifyGoogle = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId })
  return ticket.getPayload()
}

const repo = mysqlRepo(createPool())
const mailer = createMailer({ apiKey: config.resendApiKey, from: config.emailFrom, appUrl: config.appUrl })
const app = createApp({ repo, mailer, verifyGoogle, config })

app.listen(config.port, () => {
  console.log(`Orbezu API escuchando en http://localhost:${config.port}`)
})

scheduleReminders({ repo, mailer, expression: config.reminderCron, timezone: config.reminderTz })
