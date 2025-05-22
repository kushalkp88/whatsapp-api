import express from 'express';
import { create, ev } from '@open-wa/wa-automate';
import fs from 'fs-extra';
import multer from 'multer';

const SESSION_PATH = './session';
let client = null;
let qrCodeData = null;

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary upload dir

const app = express();
app.use(express.json());

// Helper to start WhatsApp client
async function startClient() {
  client = await create({
    sessionId: 'main-session',
    multiDevice: true,
    sessionDataPath: SESSION_PATH,
    qrTimeout: 0,
    headless: true,
    qrRefreshS: 30
  });

  // Listen for QR code updates
  ev.on('qr.**', (qrcode) => {
    qrCodeData = qrcode;
    // console.log("QR code updated");
  });

  client.onStateChanged((state) => {
    if (['CONFLICT', 'UNLAUNCHED', 'UNPAIRED', 'UNPAIRED_IDLE'].includes(state)) {
      client.forceRefocus();
    }
  });

  // console.log('WhatsApp client started');
}

// Start client on boot
startClient();

// Send message or image endpoint
app.post('/send', upload.single('image'), async (req, res) => {
  // Debug: log incoming data
  // console.log("client ready:", !!client);
  // console.log("req.body:", req.body);
  // console.log("req.file:", req.file);

  if (!client) {
    return res.status(503).json({ error: 'WhatsApp client not ready' });
  }

  const phone = req.body.phone;
  const message = req.body.message || 'HI';

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const waId = `${phone}@c.us`;
  // console.log("waId:", waId);

  try {
    const status = await client.checkNumberStatus(phone);
    // console.log("checkNumberStatus:", status);

    if (!status || !status.canReceiveMessage) {
      return res.status(400).json({ error: 'Number is not valid or cannot receive messages.' });
    }

    if (req.file) {
      // Send image as a document
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileName = req.file.originalname || 'file.png';
      const mimeType = req.file.mimetype || 'application/octet-stream';
      const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      // console.log("Sending file as document:", fileName, "mimeType:", mimeType);

      await client.sendFile(waId, dataUri, fileName, message);
      fs.unlinkSync(req.file.path); // Clean up uploaded file
      res.json({ status: 'sent', type: 'document' });
    } else if (req.body.image) {
      // Accept image as base64 string (backward compatible), send as document
      const dataUri = `data:image/png;base64,${req.body.image}`;
      // console.log("Sending base64 as document");
      await client.sendFile(waId, dataUri, 'image.jpg', message);
      res.json({ status: 'sent', type: 'base64-document' });
    } else {
      await client.sendText(waId, message);
      res.json({ status: 'sent', type: 'text' });
    }
  } catch (err) {
    // console.error("Error in /send:", err);
    // Clean up file if error occurs
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}); // <-- Route handler closed properly

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
app.listen(PORT, () => {
  // console.log(`API listening on port ${PORT}`);
});
