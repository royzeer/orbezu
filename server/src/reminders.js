const cron = require('node-cron')

/** Cuenta las frases cuyo repaso ya vencio. */
function countDue(progress, now = Date.now()) {
  if (!progress || !progress.reviews) return 0
  return Object.values(progress.reviews).filter((r) => r && typeof r.due === 'number' && r.due <= now).length
}

/** Envia un correo a cada persona con repasos pendientes (como maximo uno al dia). */
async function runReminders({ repo, mailer, now = Date.now(), log = console }) {
  const users = await repo.reminderCandidates()
  let sent = 0
  for (const u of users) {
    const due = countDue(u.progress, now)
    if (!due) continue
    try {
      await mailer.reminder(u, due)
      await repo.updateUser(u.id, { lastReminderAt: new Date(now) })
      sent++
    } catch (e) {
      log.error(`[recordatorios] No se pudo enviar a ${u.id}: ${e.message}`)
    }
  }
  return { checked: users.length, sent }
}

function scheduleReminders({ repo, mailer, expression, timezone }) {
  if (!cron.validate(expression)) {
    console.warn(`[recordatorios] Expresion cron invalida: ${expression}`)
    return null
  }
  return cron.schedule(
    expression,
    () => {
      runReminders({ repo, mailer })
        .then((r) => console.log(`[recordatorios] revisadas ${r.checked} cuentas, enviados ${r.sent}`))
        .catch((e) => console.error('[recordatorios]', e.message))
    },
    { timezone }
  )
}

module.exports = { countDue, runReminders, scheduleReminders }
