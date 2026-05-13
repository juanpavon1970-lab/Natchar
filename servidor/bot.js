/* ================================
   NATCHAR — Bot de WhatsApp
   Conecta directamente tu WhatsApp
   Sin Twilio, sin límites
================================ */

const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode                = require('qrcode-terminal')
const QRCode                = require('qrcode')
const http                  = require('http')
const db                    = require('./database')

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'natchar-bot' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
})

// ─────────────────────────────────
// QR — escanear para conectar
// ─────────────────────────────────
let servidorQR = null

client.on('qr', async qr => {
  console.log('\n✦ Abre esto en tu navegador para ver el QR:\n')
  console.log('http://localhost:3001/qr\n')

  const qrDataUrl = await QRCode.toDataURL(qr)

  // Si ya hay un servidor corriendo, no crear otro
  if (servidorQR) {
    servidorQR.close()
    servidorQR = null
  }

  servidorQR = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`
      <html>
        <body style="background:#0A0805; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif;">
          <p style="color:#00FFD1; letter-spacing:0.3em; text-transform:uppercase; font-size:14px; margin-bottom:2rem;">Escanea con WhatsApp</p>
          <img src="${qrDataUrl}" style="border: 4px solid #C9A84C; padding: 1rem; background:white;">
          <p style="color:#8A7550; font-size:12px; margin-top:1rem;">Dispositivos vinculados → Vincular dispositivo</p>
        </body>
      </html>
    `)
  }).listen(3001)

  client.once('ready', () => {
    if (servidorQR) {
      servidorQR.close()
      servidorQR = null
    }
  })
})

client.on('ready', () => {
  console.log('✦ Bot de WhatsApp conectado y listo')
})

client.on('auth_failure', () => {
  console.error('✦ Error de autenticación — vuelve a escanear el QR')
})

// ─────────────────────────────────
// MENSAJES ENTRANTES
// ─────────────────────────────────
client.on('message', async msg => {
  const texto  = msg.body.trim().toLowerCase()
  const numero = msg.from.replace('@c.us', '')
  const nombreNum = `+${numero}`

  console.log(`✦ Mensaje de ${nombreNum}: ${msg.body}`)

  // --- Saludo ---
  if (texto === 'hola' || texto === 'buenas' || texto === 'buenos días') {
    await msg.reply(
      `✦ ¡Hola! Bienvenido a *Natchar* 🇨🇴\n\n` +
      `Soy tu asistente virtual. ¿En qué te puedo ayudar?\n\n` +
      `1️⃣ Ver mis reservas\n` +
      `2️⃣ Cancelar una reserva\n` +
      `3️⃣ Horarios y menú\n` +
      `4️⃣ Ubicación\n\n` +
      `Responde con el número de la opción.`
    )
    return
  }

  // --- Ver reservas ---
  if (texto === '1' || texto === 'ver mis reservas') {
    const reservas = db.prepare(`
      SELECT * FROM reservas
      WHERE telefono = ? AND estado = 'activa'
      ORDER BY fecha ASC
    `).all(nombreNum)

    if (reservas.length === 0) {
      await msg.reply(
        `✦ No encontré reservas activas con tu número.\n\n` +
        `¿Deseas hacer una reserva? Visítanos en:\n` +
        `http://localhost:3000/reservas.html`
      )
      return
    }

    const horarioTexto = {
      amanecer: '☕ Amanecer (6am–11am)',
      brunch:   '☀ Brunch (10am–2pm)',
      almuerzo: '🍽 Almuerzo (12pm–4pm)',
      tarde:    '🌙 Media Tarde (3pm–7pm)'
    }

    let respuesta = `✦ Tus reservas activas en *Natchar*:\n\n`
    reservas.forEach((r, i) => {
      respuesta += `*${i + 1}.* ${formatearFecha(r.fecha)}\n`
      respuesta += `   ${horarioTexto[r.horario]}\n`
      respuesta += `   👥 ${r.personas} personas\n\n`
    })
    respuesta += `Para cancelar alguna responde *cancelar [número]*\nEj: _cancelar 1_`

    await msg.reply(respuesta)
    return
  }

  // --- Cancelar reserva ---
  if (texto.startsWith('cancelar')) {
    const partes = texto.split(' ')
    const indice = parseInt(partes[1]) - 1

    const reservas = db.prepare(`
      SELECT * FROM reservas
      WHERE telefono = ? AND estado = 'activa'
      ORDER BY fecha ASC
    `).all(nombreNum)

    if (reservas.length === 0) {
      await msg.reply('✦ No tienes reservas activas para cancelar.')
      return
    }

    if (isNaN(indice) || indice < 0 || indice >= reservas.length) {
      await msg.reply(
        `✦ Número inválido. Tienes ${reservas.length} reserva(s) activa(s).\n` +
        `Responde *cancelar 1* para cancelar la primera.`
      )
      return
    }

    const reserva = reservas[indice]

    db.prepare(`
      INSERT INTO papelera (reserva_id, nombre, telefono, correo, fecha, personas, horario, nota, razon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reserva.id, reserva.nombre, reserva.telefono,
      reserva.correo, reserva.fecha, reserva.personas,
      reserva.horario, reserva.nota, 'cancelada_por_usuario'
    )

    db.prepare(`UPDATE reservas SET estado = 'eliminada' WHERE id = ?`).run(reserva.id)

    db.prepare(`
      INSERT INTO log_acciones (accion, detalle)
      VALUES ('cancelar_bot', ?)
    `).run(`Reserva #${reserva.id} cancelada por usuario via bot`)

    await msg.reply(
      `✦ Reserva cancelada exitosamente.\n\n` +
      `📅 ${formatearFecha(reserva.fecha)}\n` +
      `🕐 ${reserva.horario}\n\n` +
      `Si deseas hacer una nueva reserva visítanos en:\n` +
      `http://localhost:3000/reservas.html\n\n` +
      `¡Esperamos verte pronto! 🇨🇴`
    )
    return
  }

  // --- Horarios ---
  if (texto === '3' || texto === 'horarios' || texto === 'menu' || texto === 'menú') {
    await msg.reply(
      `✦ *Horarios de Natchar* 🇨🇴\n\n` +
      `☕ *El Amanecer*\n6:00am – 11:00am\nChangua, calentado, pandebono, café\n\n` +
      `☀ *Brunch Dorado*\n10:00am – 2:00pm\nTamal, aborrajados, jugos, cuentos Grimm\n\n` +
      `🍽 *Gran Almuerzo*\n12:00pm – 4:00pm\nBandeja paisa, sancocho, sudado\n\n` +
      `🌙 *Media Tarde*\n3:00pm – 7:00pm\nBuñuelos, natilla, empanadas, agua panela\n\n` +
      `Ver menú completo: http://localhost:3000/menu.html`
    )
    return
  }

  // --- Ubicación ---
  if (texto === '4' || texto === 'ubicacion' || texto === 'ubicación' || texto === 'donde' || texto === 'dónde') {
    await msg.reply(
      `✦ *Natchar — Cali, Colombia* 📍\n\n` +
      `📍 Calle 3 Oeste #12-2\n` +
      `Sector Hotel Intercontinental\n` +
      `Cali, Valle del Cauca\n\n` +
      `🕐 Lunes a Viernes: 6am – 7pm\n` +
      `🕐 Sábados y Domingos: 6am – 8pm\n\n` +
      `📖 Cuentos Grimm todos los domingos 12pm–3pm`
    )
    return
  }

  // --- Respuesta por defecto ---
  await msg.reply(
    `✦ Hola, soy el asistente de *Natchar* 🇨🇴\n\n` +
    `No entendí tu mensaje. Escribe:\n\n` +
    `*hola* — para ver el menú de opciones\n` +
    `*1* — ver mis reservas\n` +
    `*2* — cancelar una reserva\n` +
    `*3* — horarios y menú\n` +
    `*4* — ubicación`
  )
})

// ─────────────────────────────────
// UTILIDADES
// ─────────────────────────────────
function formatearFecha(fecha) {
  const [y, m, d] = fecha.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d} ${meses[parseInt(m)-1]} ${y}`
}

async function enviarMensaje(numero, mensaje) {
  try {
    const chatId = `${numero.replace('+', '')}@c.us`
    await client.sendMessage(chatId, mensaje)
    console.log(`✦ Mensaje enviado a ${numero}`)
  } catch (err) {
    console.error('✦ Error enviando mensaje:', err.message)
  }
}

client.initialize()

module.exports = { enviarMensaje }