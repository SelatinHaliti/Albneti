import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isSmtpConfigured, sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const sendTokenResponse = (user, res, statusCode = 200) => {
  const token = createToken(user._id);
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
  res.cookie('token', token, options);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      website: user.website,
      location: user.location,
      isVerified: user.isVerified,
      role: user.role,
      isPrivate: user.isPrivate,
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
    },
  });
};

/**
 * Regjistrim i përdoruesit të ri
 */
export const register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Ju lutemi plotësoni emrin e përdoruesit, email-in dhe fjalëkalimin.',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    });
    if (existingUser) {
      return res.status(400).json({
        message: 'Ky email ose emër përdoruesi tashmë ekziston.',
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      password,
      fullName: fullName?.trim() || '',
      verificationToken,
      verificationTokenExpires,
    });

    // Mos e blloko përgjigjen e regjistrimit nga dërgimi i email-it.
    // Nëse email-i dështon (SMTP/API), përdoruesi prapë duhet të kyçet.
    try {
      Promise.resolve(sendVerificationEmail(user.email, verificationToken, user.username)).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('sendVerificationEmail failed:', e?.message || e);
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('sendVerificationEmail threw:', e?.message || e);
    }

    // Për siguri: mos jep token pa u verifikuar email-i.
    res.status(201).json({
      success: true,
      message: 'Regjistrimi u krye. Kontrolloni email-in për të verifikuar llogarinë.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë regjistrimit.' });
  }
};

/**
 * Kyçje
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: 'Ju lutemi vendosni email-in dhe fjalëkalimin.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i gabuar.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Llogaria juaj është bllokuar.' });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Ju lutemi verifikoni email-in para se të kyçeni. Kontrolloni inbox/spam.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i gabuar.' });
    }

    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë kyçjes.' });
  }
};

/**
 * Dalje - fshin cookie
 */
export const logout = async (req, res) => {
  res.cookie('token', '', { maxAge: 0, httpOnly: true });
  res.json({ success: true, message: 'Jeni dalë me sukses.' });
};

/**
 * Verifikim email me token
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Linku i verifikimit është i pavlefshëm ose ka skaduar.' });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë verifikimit.' });
  }
};

/**
 * Dërgo sërish email verifikimi (nëse llogaria s'është verifikuar ende)
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Vendosni email-in.' });
    if (!isSmtpConfigured()) {
      return res.status(503).json({ message: 'Email verifikimi nuk është konfiguruar në server.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'Nëse ekziston llogaria, do të merrni një email verifikimi.' });
    }
    if (user.isVerified) {
      return res.json({ success: true, message: 'Email-i tashmë është i verifikuar. Mund të kyçeni.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Llogaria juaj është bllokuar.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    const result = await sendVerificationEmail(user.email, verificationToken, user.username);
    if (!result?.ok) {
      return res.status(500).json({
        message: `Dërgimi i email-it dështoi. ${result?.error || ''}`.trim(),
      });
    }

    return res.json({ success: true, message: 'Email-i i verifikimit u dërgua. Kontrolloni inbox/spam.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Status i email-it (diagnostikë)
 */
export const emailStatus = async (req, res) => {
  res.json({
    success: true,
    smtpConfigured: isSmtpConfigured(),
    frontendUrl: process.env.FRONTEND_URL || null,
    smtpHost: process.env.SMTP_HOST ? String(process.env.SMTP_HOST) : null,
    smtpPort: process.env.SMTP_PORT ? String(process.env.SMTP_PORT) : null,
    smtpSecure: process.env.SMTP_SECURE ? String(process.env.SMTP_SECURE) : null,
    smtpFrom: process.env.SMTP_FROM ? String(process.env.SMTP_FROM) : null,
  });
};

/**
 * Kërkesë për rifreskim fjalëkalimi
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'Nëse ekziston llogaria, do të merrni një email.' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(user.email, resetToken, user.username);
    res.json({ success: true, message: 'Nëse ekziston llogaria, do të merrni një email.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Reset fjalëkalimi me token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Linku është i pavlefshëm ose ka skaduar.' });
    }
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr përdoruesin aktual
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('followers', 'username avatar fullName')
      .populate('following', 'username avatar fullName');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
