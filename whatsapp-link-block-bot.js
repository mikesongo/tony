const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')

// Regex pattern to match common links
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            if((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('Bot is online!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (msgBatch) => {
        for(const msgObj of msgBatch.messages) {
            if (!msgObj?.message || msgObj.key.fromMe) continue;
            const text = msgObj.message.conversation || 
                        msgObj.message.extendedTextMessage?.text || 
                        "";
                       
            if(linkRegex.test(text)) {
                const jid = msgObj.key.participant || msgObj.key.remoteJid

                // Send warning
                await sock.sendMessage(jid, { text: "⚠️ You have been blocked because sending links is not allowed in this bot." })

                // Block the user
                await sock.updateBlockStatus(jid, "block")
                console.log(`Blocked user: ${jid} for sending a link`)
            }
        }
    })
}

startBot()