import Reading from '../models/Reading.js';
import Alert from '../models/Alert.js';
import { evaluateSafety } from './safety.js';

export async function ingestReading(payload, io) {
  const bayId = String(payload.bayId || '').trim();
  const temperatureC = Number(payload.temperatureC);
  const currentA = Number(payload.currentA);
  const deviceOnline = payload.deviceOnline !== false;

  if (!bayId || bayId.length > 80) throw new Error('bayId is required and must be under 80 characters');
  if (!Number.isFinite(temperatureC) || temperatureC < -100 || temperatureC > 500) throw new Error('temperatureC must be a valid number between -100 and 500');
  if (!Number.isFinite(currentA) || currentA < 0 || currentA > 1000) throw new Error('currentA must be a valid number between 0 and 1000');

  const safety = evaluateSafety({ temperatureC, currentA, deviceOnline });
  const reading = await Reading.create({
    bayId, temperatureC, currentA, deviceOnline,
    source: ['esp32', 'simulator', 'manual'].includes(payload.source) ? payload.source : 'manual',
    ...safety, recordedAt: new Date()
  });

  const dto = reading.toObject();
  io.emit('reading:new', dto);
  io.emit('bay:update', dto);

  if (safety.status !== 'NORMAL') {
    const alert = await Alert.create({
      bayId, status: safety.status,
      message: safety.reasons.join('; ') || 'Abnormal reading detected',
      temperatureC, currentA
    });
    io.emit('alert:new', alert.toObject());
  }
  return dto;
}
