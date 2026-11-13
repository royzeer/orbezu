const { Resend } = require('resend')

const layout = (title, body, appUrl) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#16142e">
  <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
  ${body}
  <p style="margin-top:24px"><a href="${appUrl}" style="background:#6d5df5;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block">Abrir Orbezu</a></p>
  <p style="color:#5d5b78;font-size:12px;margin-top:24px">Tu segunda lengua, como la primera.</p>
</div>`

const escape = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Envia correos con Resend. Sin API key, solo los muestra en la consola. */
function createMailer({ apiKey, from, appUrl }) {
  const resend = apiKey ? new Resend(apiKey) : null
  const send = async ({ to, subject, html, text }) => {
    if (!resend) {
      console.log(`[correo simulado] Para: ${to} | ${subject}`)
      return { simulated: true }
    }
    const { data, error } = await resend.emails.send({ from, to, subject, html, text })
    if (error) throw new Error(error.message || 'Resend no pudo enviar el correo')
    return data
  }
  return {
    send,
    welcome: (user) =>
      send({
        to: user.email,
        subject: 'Bienvenido a Orbezu',
        text: `Hola ${user.name || ''}. Tu cuenta de Orbezu está lista. Escucha mucho, repite imitando y deja que la gramática aparezca sola.`,
        html: layout(`Hola ${escape(user.name) || ''}`, '<p>Tu cuenta de Orbezu está lista. Escucha mucho, repite imitando y deja que la gramática aparezca sola.</p>', appUrl)
      }),
    reminder: (user, count) =>
      send({
        to: user.email,
        subject: `Tienes ${count} ${count === 1 ? 'frase' : 'frases'} para repasar`,
        text: `Hola ${user.name || ''}. Hoy tienes ${count} ${count === 1 ? 'frase' : 'frases'} en tu repaso. Es el mejor momento para recordarlas, justo antes de olvidarlas.`,
        html: layout(
          'Es buen momento para repasar',
          `<p>Hoy tienes <strong>${count}</strong> ${count === 1 ? 'frase' : 'frases'} en tu repaso. Es el mejor momento para recordarlas, justo antes de olvidarlas.</p><p style="color:#5d5b78;font-size:13px">Puedes desactivar estos correos en Cuenta.</p>`,
          `${appUrl}#/repaso`
        )
      })
  }
}

module.exports = { createMailer }
