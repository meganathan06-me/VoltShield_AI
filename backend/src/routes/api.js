import { Router } from 'express';
import Reading from '../models/Reading.js';
import Alert from '../models/Alert.js';
import { ingestReading } from '../services/ingest.js';

export default function createApiRouter(io) {
  const router = Router();

  router.get('/health', (_req, res) => res.json({ ok: true, service: 'VoltShield API', time: new Date().toISOString() }));

  router.post('/readings', async (req, res, next) => {
    try {
      const reading = await ingestReading(req.body, io);
      res.status(201).json({ success: true, reading });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  router.get('/readings', async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const filter = req.query.bayId ? { bayId: String(req.query.bayId) } : {};
      const readings = await Reading.find(filter).sort({ recordedAt: -1 }).limit(limit).lean();
      res.json({ success: true, count: readings.length, readings: readings.reverse() });
    } catch (err) { next(err); }
  });

  router.get('/bays', async (_req, res, next) => {
    try {
      const latest = await Reading.aggregate([
        { $sort: { recordedAt: -1 } },
        { $group: { _id: '$bayId', latest: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latest' } },
        { $sort: { bayId: 1 } }
      ]);
      res.json({ success: true, bays: latest });
    } catch (err) { next(err); }
  });

  router.get('/dashboard/summary', async (_req, res, next) => {
    try {
      const latest = await Reading.aggregate([
        { $sort: { recordedAt: -1 } },
        { $group: { _id: '$bayId', latest: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latest' } }
      ]);
      res.json({
        success: true,
        totalBays: latest.length,
        onlineBays: latest.filter(x => x.deviceOnline).length,
        normalBays: latest.filter(x => x.status === 'NORMAL').length,
        warningBays: latest.filter(x => x.status === 'WARNING').length,
        criticalBays: latest.filter(x => x.status === 'CRITICAL').length,
        latestReadings: latest
      });
    } catch (err) { next(err); }
  });

  router.get('/alerts', async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const alerts = await Alert.find().sort({ createdAt: -1 }).limit(limit).lean();
      res.json({ success: true, alerts });
    } catch (err) { next(err); }
  });

  router.patch('/alerts/:id/acknowledge', async (req, res, next) => {
    try {
      const alert = await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true }, { new: true });
      if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
      io.emit('alert:update', alert.toObject());
      res.json({ success: true, alert });
    } catch (err) { next(err); }
  });

  return router;
}
