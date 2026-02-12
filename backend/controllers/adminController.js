import User from '../models/User.js';
import Post from '../models/Post.js';
import Report from '../models/Report.js';

/**
 * Statistikat e përgjithshme
 */
export const getStats = async (req, res) => {
  try {
    const [usersCount, postsCount, reportsPending] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ isArchived: false }),
      Report.countDocuments({ status: 'pending' }),
    ]);
    res.json({ usersCount, postsCount, reportsPending });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Lista e raportimeve
 */
export const getReports = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const reports = await Report.find({ status })
      .sort({ createdAt: -1 })
      .populate('reporter', 'username email')
      .populate('reportedUser', 'username avatar')
      .populate('reportedPost')
      .populate('reportedStory')
      .lean();
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Përditëso statusin e raportit
 */
export const updateReportStatus = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Raporti nuk u gjet.' });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Blloko përdorues (admin)
 */
export const blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Zhblloko përdorues
 */
export const unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Lista përdorues (admin)
 */
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const users = await User.find()
      .select('-password -verificationToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
