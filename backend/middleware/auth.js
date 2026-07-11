import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Mbrojtja e rrugëve - kërkon JWT të vlefshëm
 */
export const protect = async (req, res, next) => {
  let token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '') ||
    null;

  if (!token) {
    return res.status(401).json({ message: 'Ju nuk jeni të kyçur. Kyçuni për të vazhduar.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Llogaria juaj është bllokuar.' });
    }
    req.user = user;
    req.user.id = user._id.toString();
    User.findByIdAndUpdate(user._id, { lastActiveAt: new Date() }).catch(() => {});
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Sesioni ka skaduar. Kyçuni përsëri.' });
  }
};

/**
 * Opsional auth - vendos req.user nëse ka token, por nuk kërkon
 */
export const optionalAuth = async (req, res, next) => {
  let token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '') ||
    null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && !user.isBlocked) {
      req.user = user;
      req.user.id = user._id.toString();
    }
  } catch (_) {}
  next();
};

/**
 * Kërkon që përdoruesi të jetë admin
 */
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
    return res.status(403).json({ message: 'Nuk keni të drejta administratori.' });
  }
  next();
};
