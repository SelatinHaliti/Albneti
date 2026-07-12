import {
  runWeeklyMarketingEmails,
  unsubscribeMarketingByToken,
  getMarketingStats,
  sendMarketingTestEmail,
  getAIMarketingPreview,
  runAIMarketingBlast,
  startAIMarketingBlast,
  getBlastStatus,
} from '../services/marketingEmailService.js';

function verifyCronSecret(req) {
  const secret = process.env.CRON_SECRET || process.env.MARKETING_CRON_SECRET;
  if (!secret) return false;
  const header = req.headers['x-cron-secret'] || req.headers.authorization?.replace('Bearer ', '');
  return header === secret;
}

/** Cron i jashtëm ose scheduler – dërgon AlbNet Ads javore */
export const weeklyMarketingCron = async (req, res) => {
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ message: 'I paautorizuar.' });
  }
  try {
    const result = await runWeeklyMarketingEmails({ triggeredBy: 'cron' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Çabonim publik nga email marketing */
export const marketingUnsubscribe = async (req, res) => {
  try {
    const token = req.query.token || req.body?.token;
    const result = await unsubscribeMarketingByToken(token);
    if (!result.ok) return res.status(400).json(result);
    res.json({ success: true, message: 'U çabonuat nga emailet marketing AlbNet Ads.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Admin: statistika marketing */
export const adminMarketingStats = async (_req, res) => {
  try {
    const stats = await getMarketingStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Admin: dërgo 1 email test (verifikon SMTP + dizajnin) */
export const adminTestMarketingEmail = async (req, res) => {
  try {
    const to = String(req.body?.email || '').trim().toLowerCase();
    if (!to || !to.includes('@')) {
      return res.status(400).json({ message: 'Email i pavlefshëm.' });
    }
    const result = await sendMarketingTestEmail(to);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Admin: preview marketing të gjeneruar me AI */
export const adminAIMarketingPreview = async (_req, res) => {
  try {
    const result = await getAIMarketingPreview();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Admin: 1 klik – nis dërgim në background */
export const adminAIMarketingBlast = async (req, res) => {
  try {
    const result = await startAIMarketingBlast({ triggeredBy: 'admin' });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Admin: status i blast-it */
export const adminBlastStatus = async (req, res) => {
  try {
    const runKey = req.query.runKey || req.params.runKey;
    const result = await getBlastStatus(runKey);
    if (!result.ok) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/** Admin: dërgo manualisht kampanjën javore */
export const adminSendWeeklyMarketing = async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await runWeeklyMarketingEmails({ force, triggeredBy: 'admin' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
