import mqtt from 'mqtt';
import { ingestReading } from './ingest.js';

export function startMqtt(io) {
  const url = process.env.MQTT_URL;
  if (!url) {
    console.warn('MQTT_URL not set; MQTT subscriber disabled');
    return;
  }
  const options = {};
  if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;
  const client = mqtt.connect(url, options);

  client.on('connect', () => {
    console.log('MQTT connected:', url.replace(/\/\/.*@/, '//[credentials]@'));
    client.subscribe(process.env.MQTT_TOPIC || 'voltshield/bays/+/readings', { qos: 0 }, err => {
      if (err) console.error('MQTT subscribe failed:', err.message);
      else console.log('Subscribed to sensor telemetry topic');
    });
  });
  client.on('message', async (_topic, buffer) => {
    try {
      const payload = JSON.parse(buffer.toString());
      payload.source = 'esp32';
      await ingestReading(payload, io);
    } catch (err) {
      console.error('Ignored invalid MQTT message:', err.message);
    }
  });
  client.on('error', err => console.error('MQTT error:', err.message));
  return client;
}
