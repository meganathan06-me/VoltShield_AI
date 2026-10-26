#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <math.h>

// -------- CHANGE THESE SETTINGS --------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Use your computer's actual IPv4 address from ipconfig.
const char* API_URL = "http://192.168.6.36:5000/api/readings";
const char* BAY_ID = "DOCK-01";

// -------- SENSOR PINS --------
const int ACS_PIN = 34;

// Example calibration values only.
// Calibrate for your actual ACS712 variant and circuit.
const float ADC_REFERENCE_V = 3.3f;
const float ADC_MAX = 4095.0f;
const float ACS_ZERO_V = 1.65f;
const float ACS_SENSITIVITY_V_PER_A = 0.100f;

Adafruit_MLX90614 mlx = Adafruit_MLX90614();

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL_MS = 3000;

float readCurrentA() {
  const int samples = 100;
  uint32_t total = 0;

  for (int i = 0; i < samples; i++) {
    total += analogRead(ACS_PIN);
    delay(2);
  }

  float averageADC = total / float(samples);
  float voltage = averageADC * ADC_REFERENCE_V / ADC_MAX;

  float current =
      (voltage - ACS_ZERO_V) / ACS_SENSITIVITY_V_PER_A;

  // Demonstration for a suitable DC test load only.
  return fabs(current);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("ESP32 IP address: ");
  Serial.println(WiFi.localIP());
}

void sendReading(float temperatureC, float currentA) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected; reading not sent.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  if (!http.begin(client, API_URL)) {
    Serial.println("Could not start HTTP connection.");
    return;
  }

  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"bayId\":\"";
  payload += BAY_ID;
  payload += "\",";
  payload += "\"temperatureC\":";
  payload += String(temperatureC, 2);
  payload += ",";
  payload += "\"currentA\":";
  payload += String(currentA, 3);
  payload += ",";
  payload += "\"deviceOnline\":true,";
  payload += "\"source\":\"esp32\"";
  payload += "}";

  int statusCode = http.POST(payload);

  Serial.print("HTTP status: ");
  Serial.println(statusCode);

  Serial.print("Sent: ");
  Serial.println(payload);

  if (statusCode > 0) {
    Serial.print("Server response: ");
    Serial.println(http.getString());
  } else {
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(statusCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);

  analogReadResolution(12);
  Wire.begin(21, 22);

  connectWiFi();

  if (!mlx.begin()) {
    Serial.println("MLX90614 not found. Check sensor wiring.");
    while (true) {
      delay(1000);
    }
  }

  Serial.println("VoltShield HTTP sensor sender ready.");
}

void loop() {
  connectWiFi();

  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();

    float temperatureC = mlx.readObjectTempC();
    float currentA = readCurrentA();

    if (!isfinite(temperatureC) || !isfinite(currentA)) {
      Serial.println("Invalid sensor reading; skipping.");
      return;
    }

    Serial.print("Temperature: ");
    Serial.print(temperatureC);
    Serial.print(" C | Current: ");
    Serial.print(currentA);
    Serial.println(" A");

    sendReading(temperatureC, currentA);
  }
}
