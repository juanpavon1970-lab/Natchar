const express  = require('express')
const path     = require('path')
const db       = require('./database')

const app  = express()
const PORT = 3000

// ─────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────
const LIMITE_POR_FRANJA    = 10  // máx reservas por fecha+horario
const LIMITE_POR_DIA       = 3   // máx reservas por número por día
const MAX_PERSONAS         = 20  // máx personas por reserva
const MAX_DIAS_FUTURO      = 60  // máx días hacia el futuro
const DIAS_PAPELERA        = 7   // días antes de limpiar papelera
const PANEL_PASSWORD       = 'natchar2024' // contraseña del panel

// ─────────────────────────────────
// MIDDLEWARES
// ─────────────────────────────────
app.use(express.json())
app.use(express.static(path.join(__dirname, '..')))

// ─────────────────────────────────
// WHATSAPP
// ─────────────────────────────────
async function notificarWhatsApp(reserva) {
  try {
    await twilioClient.messages.create({
      from: TWILIO_FROM,
      to:   TWILIO_TO,
      body: `✦ NUEVA RESERVA — NATCHAR\n\n👤 ${reserva.nombre}\n📱 ${reserva.telefono}\n📧 ${reserva.correo || 'No indicado'}\n📅 ${reserva.fecha}\n👥 ${reserva.personas} personas\n🕐 ${reserva.horario}\n📝 ${reserva.nota || 'Sin nota'}`
    })

    await twilioClient.messages.create({
      from: TWILIO_FROM,
      to:   `whatsapp:${reserva.telefono}`,
      body: `✦ Hola ${reserva.nombre}, tu reserva en *Natchar* ha sido confirmada.\n\n📅 Fecha: ${reserva.fecha}\n👥 Personas: ${reserva.personas}\n🕐 Horario: ${reserva.horario}\n\nTe esperamos en el sector Intercontinental, Cali. ¡Nos vemos pronto! 🇨🇴`
    })

    console.log('✦ WhatsApp enviado')
  } catch (err) {
    console.error('✦ Error WhatsApp:', err.message)
  }
}

// ─────────────────────────────────
// TAREAS AUTOMÁTICAS
// ─────────────────────────────────

// Mover reservas vencidas a papelera
function moverReservasVencidas() {
  const hoy = new Date().toISOString().split('T')[0]

  const vencidas = db.prepare(`
    SELECT * FROM reservas
    WHERE fecha < ? AND estado = 'activa'
  `).all(hoy)

  vencidas.forEach(r => {
    db.prepare(`
      INSERT INTO papelera (reserva_id, nombre, telefono, correo, fecha, personas, horario, nota, razon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(r.id, r.nombre, r.telefono, r.correo, r.fecha, r.personas, r.horario, r.nota, 'fecha_vencida')

    db.prepare(`UPDATE reservas SET estado = 'vencida' WHERE id = ?`).run(r.id)

    db.prepare(`
      INSERT INTO log_acciones (accion, detalle)
      VALUES ('mover_papelera', ?)
    `).run(`Reserva #${r.id} de ${r.nombre} movida por fecha vencida`)
  })

  if (vencidas.length > 0) {
    console.log(`✦ ${vencidas.length} reservas movidas a papelera`)
  }
}

// Limpiar papelera de más de 7 días
function limpiarPapelera() {
  const resultado = db.prepare(`
    DELETE FROM papelera
    WHERE eliminada_en <= datetime('now', '-${DIAS_PAPELERA} days')
  `).run()

  if (resultado.changes > 0) {
    console.log(`✦ ${resultado.changes} registros eliminados de papelera`)
    db.prepare(`
      INSERT INTO log_acciones (accion, detalle)
      VALUES ('limpiar_papelera', ?)
    `).run(`${resultado.changes} registros eliminados`)
  }
}

// Correr tareas al iniciar y cada 24 horas
moverReservasVencidas()
limpiarPapelera()
setInterval(() => {
  moverReservasVencidas()
  limpiarPapelera()
}, 24 * 60 * 60 * 1000)

// ─────────────────────────────────
// RUTAS — ESTADO
// ─────────────────────────────────
app.get('/api/estado', (req, res) => {
  res.json({ ok: true, mensaje: '✦ Natchar servidor activo' })
})

// ─────────────────────────────────
// RUTAS — PANEL (protegido)
// ─────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body
  if (password === PANEL_PASSWORD) {
    res.json({ ok: true, token: Buffer.from(PANEL_PASSWORD).toString('base64') })
  } else {
    res.status(401).json({ ok: false, error: 'Contraseña incorrecta' })
  }
})

function verificarAcceso(req, res, next) {
  const token = req.headers['x-panel-token']
  const esperado = Buffer.from(PANEL_PASSWORD).toString('base64')
  if (token !== esperado) {
    return res.status(401).json({ ok: false, error: 'Acceso no autorizado' })
  }
  next()
}

// ─────────────────────────────────
// RUTAS — RESERVAS
// ─────────────────────────────────

// GET — obtener reservas activas (protegido)
app.get('/api/reservas', verificarAcceso, (req, res) => {
  try {
    const reservas = db.prepare(`
      SELECT * FROM reservas
      WHERE estado = 'activa'
      ORDER BY fecha ASC, creada_en DESC
    `).all()
    res.json({ ok: true, total: reservas.length, reservas })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

// GET — papelera (protegido)
app.get('/api/papelera', verificarAcceso, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT * FROM papelera ORDER BY eliminada_en DESC
    `).all()
    res.json({ ok: true, total: items.length, items })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

// GET — disponibilidad por fecha y horario (público)
app.get('/api/disponibilidad', (req, res) => {
  const { fecha, horario } = req.query
  if (!fecha || !horario) {
    return res.status(400).json({ ok: false, error: 'Faltan parámetros' })
  }
  const count = db.prepare(`
    SELECT COUNT(*) as total FROM reservas
    WHERE fecha = ? AND horario = ? AND estado = 'activa'
  `).get(fecha, horario)

  const disponible = count.total < LIMITE_POR_FRANJA
  res.json({
    ok: true,
    disponible,
    ocupadas: count.total,
    limite: LIMITE_POR_FRANJA,
    quedan: Math.max(0, LIMITE_POR_FRANJA - count.total)
  })
})

// POST — crear reserva (público)
app.post('/api/reservas', async (req, res) => {
  const { nombre, telefono, correo, fecha, personas, horario, nota } = req.body

  // 1. Campos obligatorios
  if (!nombre || !telefono || !fecha || !personas || !horario) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' })
  }

  // 2. Teléfono válido
  const telefonoLimpio = telefono.replace(/\s/g, '')
  if (!/^\+\d{7,15}$/.test(telefonoLimpio)) {
    return res.status(400).json({
      ok: false,
      error: 'El teléfono debe incluir código de país. Ej: +57 300 0000000'
    })
  }

  // 3. Correo válido
  if (correo && !correo.includes('@')) {
    return res.status(400).json({ ok: false, error: 'El correo no es válido' })
  }

  // 4. Fecha no pasada
  const hoy = new Date().toISOString().split('T')[0]
  if (fecha < hoy) {
    return res.status(400).json({ ok: false, error: 'No puedes reservar en una fecha pasada' })
  }

  // 5. Fecha no muy lejana
  const fechaMax = new Date()
  fechaMax.setDate(fechaMax.getDate() + MAX_DIAS_FUTURO)
  const fechaMaxStr = fechaMax.toISOString().split('T')[0]
  if (fecha > fechaMaxStr) {
    return res.status(400).json({
      ok: false,
      error: `Solo puedes reservar con máximo ${MAX_DIAS_FUTURO} días de anticipación`
    })
  }

  // 6. Máximo de personas
  if (parseInt(personas) > MAX_PERSONAS) {
    return res.status(400).json({
      ok: false,
      error: `El máximo por reserva es ${MAX_PERSONAS} personas`
    })
  }

  // 7. Mismo número + misma fecha + mismo horario
  const duplicado = db.prepare(`
    SELECT id FROM reservas
    WHERE telefono = ? AND fecha = ? AND horario = ? AND estado = 'activa'
  `).get(telefonoLimpio, fecha, horario)

  if (duplicado) {
    return res.status(409).json({
      ok: false,
      error: 'Ya tienes una reserva para esa fecha y horario'
    })
  }

  // 8. Máximo 3 reservas por día por número
  const reservasHoy = db.prepare(`
    SELECT COUNT(*) as total FROM reservas
    WHERE telefono = ? AND creada_en >= date('now') AND estado = 'activa'
  `).get(telefonoLimpio)

  if (reservasHoy.total >= LIMITE_POR_DIA) {
    return res.status(429).json({
      ok: false,
      error: `Máximo ${LIMITE_POR_DIA} reservas por día desde el mismo número`
    })
  }

  // 9. Límite por franja horaria
  const enFranja = db.prepare(`
    SELECT COUNT(*) as total FROM reservas
    WHERE fecha = ? AND horario = ? AND estado = 'activa'
  `).get(fecha, horario)

  if (enFranja.total >= LIMITE_POR_FRANJA) {
    return res.status(409).json({
      ok: false,
      error: `El horario ${horario} del ${fecha} está lleno. Elige otra fecha u horario`
    })
  }

  // ✅ Todo válido — guardar
  try {
    const resultado = db.prepare(`
      INSERT INTO reservas (nombre, telefono, correo, fecha, personas, horario, nota)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nombre, telefonoLimpio, correo || '', fecha, parseInt(personas), horario, nota || '')

    db.prepare(`
      INSERT INTO log_acciones (accion, detalle)
      VALUES ('nueva_reserva', ?)
    `).run(`Reserva #${resultado.lastInsertRowid} — ${nombre} — ${fecha} — ${horario}`)

//    await notificarWhatsApp({ nombre, telefono: telefonoLimpio, correo, fecha, personas, horario, nota })

    res.json({ ok: true, id: resultado.lastInsertRowid, mensaje: '✦ Reserva confirmada' })

  } catch (error) {
    console.error('Error al guardar:', error)
    res.status(500).json({ ok: false, error: 'Error interno del servidor' })
  }
})

// DELETE — mover a papelera (protegido)
app.delete('/api/reservas/:id', verificarAcceso, (req, res) => {
  try {
    const { id } = req.params
    const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(id)

    if (!reserva) {
      return res.status(404).json({ ok: false, error: 'Reserva no encontrada' })
    }

    // Mover a papelera
    db.prepare(`
      INSERT INTO papelera (reserva_id, nombre, telefono, correo, fecha, personas, horario, nota, razon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reserva.id, reserva.nombre, reserva.telefono, reserva.correo, reserva.fecha, reserva.personas, reserva.horario, reserva.nota, 'eliminada_manualmente')

    db.prepare(`UPDATE reservas SET estado = 'eliminada' WHERE id = ?`).run(id)

    db.prepare(`
      INSERT INTO log_acciones (accion, detalle)
      VALUES ('eliminar_reserva', ?)
    `).run(`Reserva #${id} de ${reserva.nombre} movida a papelera manualmente`)

    res.json({ ok: true, mensaje: '✦ Reserva movida a papelera' })
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})
// PUT — recuperar reserva de papelera
app.put('/api/papelera/:id/recuperar', verificarAcceso, (req, res) => {
  try {
    const { id } = req.params

    const enPapelera = db.prepare(
      'SELECT * FROM papelera WHERE id = ?'
    ).get(id)

    if (!enPapelera) {
      return res.status(404).json({ ok: false, error: 'No encontrada en papelera' })
    }

    // En vez de insertar, simplemente reactivar la reserva original
    db.prepare(`
      UPDATE reservas SET estado = 'activa' WHERE id = ?
    `).run(enPapelera.reserva_id)

    // Borrar de papelera
    db.prepare('DELETE FROM papelera WHERE id = ?').run(id)

    db.prepare(`
      INSERT INTO log_acciones (accion, detalle)
      VALUES ('recuperar_reserva', ?)
    `).run(`Reserva #${enPapelera.reserva_id} de ${enPapelera.nombre} recuperada`)

    res.json({ ok: true, mensaje: '✦ Reserva recuperada exitosamente' })

  } catch (error) {
    console.error('Error al recuperar:', error)
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

// ─────────────────────────────────
// ARRANCAR
// ─────────────────────────────────
app.listen(PORT, () => {
  console.log(`✦ Natchar corriendo en http://localhost:${PORT}`)
  console.log(`✦ Panel en http://localhost:${PORT}/panel.html`)
})