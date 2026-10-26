<<<<<<< HEAD
# VoltShield AI — End-to-End Starter

A beginner-friendly prototype for EV charging-bay monitoring.

## Stack
- ESP32 + MLX90614 temperature sensor + ACS712 current sensor
- MQTT broker (Mosquitto locally or a hosted broker)
- Node.js + Express + Mongoose + Socket.IO
- MongoDB Atlas
- React + Vite + Recharts
- Optional Python Isolation Forest service

> Safety note: This is an educational low-voltage prototype, not a certified EV charger protection system. Do not connect the demo relay to mains, a real EV charger, or a battery cutoff circuit. Use independent, properly rated protection and qualified engineering review. The sample thresholds are illustrative and must be calibrated for your sensor, load, and test setup.

## 0. Prerequisites
Install:
- Node.js LTS and npm
- Git (optional)
- Arduino IDE and ESP32 board support (for hardware stage)
- A MongoDB Atlas account
- An MQTT broker. For local development, install Mosquitto; alternatively use a trusted hosted MQTT broker and configure TLS/credentials.

## 1. Create MongoDB Atlas database
1. Create a free Atlas cluster.
2. Create a database user and strong password.
3. In Network Access, allow your development IP. Avoid `0.0.0.0/0` except for a brief controlled test; remove it afterward.
4. Copy the Node.js connection string and replace the username/password/database placeholders.
5. The backend creates collections automatically on first insert.

## 2. Configure and start backend
Open a terminal in `backend/`:
```bash
cp .env.example .env
```
Edit `.env`, setting `MONGODB_URI`. For local Mosquitto use `MQTT_URL=mqtt://localhost:1883`.
Then:
```bash
npm install
npm run dev
```
Health check: http://localhost:5000/api/health

If you don't have MQTT running yet, the backend still runs; the MQTT connection will retry. You can use the simulator below to send readings over HTTP.

## 3. Run simulator (no hardware required)
In a second terminal:
```bash
cd simulator
npm install
npm start
```
It sends sample readings to `POST http://localhost:5000/api/readings` every 3 seconds. Stop with Ctrl+C.

## 4. Start React dashboard
In a third terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open the local URL printed by Vite (normally http://localhost:5173). The dashboard uses the backend API and Socket.IO for live updates.

## 5. Hardware wiring (prototype only)
The included sketch is in `esp32/VoltShieldESP32.ino`. Install Arduino libraries:
- Adafruit MLX90614 Library
- PubSubClient

Suggested example wiring (verify your exact sensor breakout board and ESP32 model):
- MLX90614 SDA -> GPIO 21; SCL -> GPIO 22; VIN -> voltage accepted by your module; GND -> GND.
- ACS712 OUT -> GPIO 34 (ADC input); VCC -> 5V only if your module requires it; GND -> common GND.
- Demo LED/buzzer outputs are optional. Use suitable current-limiting resistors for LEDs.
- Never feed a 5V sensor output directly into an ESP32 ADC pin. Use a suitable divider/level-shifting circuit if needed. Confirm ADC range and sensor module pinout.
- ACS712 readings depend on module variant, ADC reference, calibration, and load. Calibrate `ACS_ZERO_V` and `ACS_SENSITIVITY_V_PER_A` before interpreting current.

Set Wi-Fi, MQTT broker address, and topic in the sketch. For a local broker, the ESP32 must be on the same network and use your computer's LAN IP, not `localhost`. Secure a hosted broker with credentials/TLS before exposing it to the internet.

## 6. MQTT message format
Topic: `voltshield/bays/DOCK-01/readings`
```json
{
  "bayId": "DOCK-01",
  "temperatureC": 36.2,
  "currentA": 1.4,
  "deviceOnline": true,
  "source": "esp32"
}
```
The backend timestamps messages on receipt. Do not publish secrets in telemetry.

## 7. Optional Python AI service
```bash
cd ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
This optional demo service exposes `POST http://localhost:8001/score` and returns an Isolation Forest anomaly score. It is not wired into the main dashboard by default; add it only after the basic system is stable. An anomaly score is not a validated fire prediction.

## API overview
- `GET /api/health` — service status
- `GET /api/dashboard/summary` — latest bay states and counts
- `GET /api/bays` — latest state for each known bay
- `GET /api/readings?bayId=DOCK-01&limit=100` — historical readings
- `POST /api/readings` — submit a reading (simulator/testing)
- `GET /api/alerts?limit=50` — recent alert records

The backend broadcasts `reading:new`, `bay:update`, and `alert:new` Socket.IO events.

## Project structure
```text
backend/       Express API, MongoDB models, MQTT subscriber, safety rules
frontend/      React dashboard
simulator/     HTTP sensor-data simulator
esp32/         Arduino sketch
ai-service/    Optional FastAPI + Isolation Forest example
```

## Troubleshooting
- MongoDB connection error: check the URI, URL-encode special characters in the password, and verify Atlas Network Access.
- No readings: run simulator, confirm backend port 5000, and check the browser Network tab.
- Dashboard can't reach API: ensure `frontend/.env` has `VITE_API_URL=http://localhost:5000`.
- MQTT not connecting: verify broker address/port and credentials; use the computer's LAN IP from ESP32.
- CORS error: update `CLIENT_ORIGIN` in backend `.env` to the frontend origin.
=======
# VoltShield_AI
>>>>>>> 18e1c66bd327687c32f30f6866d287c4d989ef58
