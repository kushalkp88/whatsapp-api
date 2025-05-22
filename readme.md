WhatsApp API (Minimal, with Session Persistence)

A minimal Node.js API for sending WhatsApp messages and images using @open-wa/wa-automate, with session persistence and an endpoint to switch WhatsApp accounts via QR code.
🚀 Features
Send WhatsApp messages and images via a simple REST API
Session persistence (no need to scan QR code after every restart)
/changesession endpoint to switch WhatsApp accounts (triggers new QR code)
/qrcode endpoint to fetch the current QR code (for scanning in a UI)
🛠️ Setup
1. Clone the Repository
bash
git clone https://github.com/yourusername/whatsapp-api.git
cd whatsapp-api
2. Install Dependencies
bash
npm install
3. (Optional) Set Environment Variables
No environment variables are required for the minimal setup.
If you wish to change the port, set PORT in your environment.
▶️ Running the API
bash
npm start
On the first run, a QR code will be generated.
Use the /qrcode endpoint to fetch the QR code (as a base64 string).
Scan the QR code with your WhatsApp mobile app to authenticate.
The session will be saved in the ./session directory for future runs.
🧪 Example Usage
1. Get the QR Code
bash
curl http://localhost:3000/qrcode
The response will be a JSON object with a qr field (base64 string).
You can use a QR code scanner app or a web UI to display and scan it.
2. Send a Message
bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "911234567890",
    "message": "Hello from my API!"
  }'
Replace 911234567890 with the recipient's phone number (with country code, no +).
3. Send an Image
bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "911234567890",
    "image": "<BASE64_IMAGE_STRING>",
    "message": "Here is an image!"
  }'
Replace <BASE64_IMAGE_STRING> with your image encoded in base64.
4. Switch WhatsApp Account
bash
curl -X POST http://localhost:3000/changesession
This will log out the current WhatsApp session, delete the session data, and trigger a new QR code.
Fetch the new QR code from /qrcode and scan it with the new WhatsApp account.
📁 Project Structure
text
whatsapp-api/
├── package.json
├── index.js
├── .gitignore
└── session/          # (auto-created, stores WhatsApp session data)
📝 Notes
Session Persistence: The WhatsApp session is saved in the ./session folder. Do not delete this folder unless you want to switch accounts.
Security: For production use, add authentication and rate limiting to your endpoints.
Image Sending: The image field must be a base64-encoded string.
