import express from 'express';
import { create, ev } from '@open-wa/wa-automate';
import fs from 'fs-extra';

const SESSION_PATH = './session';
let client = null;
let qrCodeData = null;

const app = express();
app.use(express.json());

// Helper to start WhatsApp client
async function startClient() {
  client = await create({
    sessionId: 'main-session',
    multiDevice: true,
    sessionDataPath: SESSION_PATH,
    qrTimeout: 0, // Wait indefinitely for QR scan
    headless: true,
    qrRefreshS: 30
  });

  // Listen for QR code updates
  ev.on('qr.**', (qrcode) => {
    qrCodeData = qrcode;
  });

  client.onStateChanged((state) => {
    if (['CONFLICT', 'UNLAUNCHED', 'UNPAIRED', 'UNPAIRED_IDLE'].includes(state)) {
      client.forceRefocus();
    }
  });
}

// Start client on boot
startClient();

// Send message endpoint
app.post('/send', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'WhatsApp client not ready' });
  const { phone, message, image } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  try {
    if (image) {
      await client.sendImage(`${phone}@c.us`, image, 'image.jpg', message || '');
    } else {
      await client.sendText(`${phone}@c.us`, message || 'HI');
    }
    res.json({ status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get QR code endpoint (optional, for polling)
app.get('/qrcode', (req, res) => {
  if (qrCodeData) {
    res.json({ qr: qrCodeData });
  } else {
    res.status(404).json({ error: 'No QR code available' });
  }
});

// Change session endpoint
app.post('/changesession', async (req, res) => {
  try {
    if (client) {
      await client.logout();
      await client.kill();
      client = null;
    }
    await fs.remove(SESSION_PATH);
    qrCodeData = null;
    await startClient();
    setTimeout(() => {
      if (qrCodeData) {
        res.json({ qr: qrCodeData });
      } else {
        res.status(202).json({ message: 'QR code not ready yet, try again.' });
      }
    }, 2000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (req, res) => res.send('WhatsApp API running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
