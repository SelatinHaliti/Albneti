import Report from '../models/Report.js';

/**
 * Dërgo raport
 */
export const createReport = async (req, res) => {
  try {
    const { reportedUser, reportedPost, reportedStory, reason, description } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Zgjidhni një arsye.' });
    }
    if (!reportedUser && !reportedPost && !reportedStory) {
      return res.status(400).json({ message: 'Specifikoni përdorues, postim ose story për të raportuar.' });
    }
    const report = await Report.create({
      reporter: req.user.id,
      reportedUser: reportedUser || undefined,
      reportedPost: reportedPost || undefined,
      reportedStory: reportedStory || undefined,
      reason,
      description: description?.slice(0, 500),
    });
    res.status(201).json({ success: true, message: 'Raporti u dërgua. Faleminderit.', report });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
