import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import Pino from 'pino'
import express from 'express'
import qrcode from 'qrcode-terminal'

// Малък HTTP сървър, за да е „жив“ в Railway
const app = express()
const PORT = process.env.PORT || 3000
app.get('/', (_, res) => res.send('WA bot up'))
app.listen(PORT, () => console.log('HTTP keepalive on port', PORT))

// Околна променлива за pairing code (ако искаш без QR)
const PAIR_PHONE = process.env.WA_PHONE || ''   // пример: 3598XXXXXXXX
const USE_PAIR = !!PAIR_PHONE

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({
    logger: Pino({ level: 'silent' }),
    printQRInTerminal: !USE_PAIR, // QR, ако няма pairing
    auth: state
  })

  sock.ev.on('creds.update', saveCreds)

  // Pairing code (без QR) – работи само ако подадеш WA_PHONE
  if (USE_PAIR && !sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(PAIR_PHONE)
      console.log('PAIRING CODE:', code)
      console.log('Въведи кода в WhatsApp: Свързани устройства → Свържи устройство → Въведи код')
    } catch (e) {
      console.error('Pairing error:', e?.message || e)
    }
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✅ Connected to WhatsApp')
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...')
        start()
      } else {
        console.log('Logged out. Delete ./auth and restart.')
      }
    }
  })

  // Пример: отговор на “ping”
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages?.[0]
      if (!msg?.message || msg.key.fromMe) return
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
      if (text.trim().toLowerCase() === 'ping') {
        await sock.sendMessage(msg.key.remoteJid, { text: 'pong 🏓' })
      }
    } catch (e) {
      console.error('msg error:', e?.message || e)
    }
  })
}

start()
