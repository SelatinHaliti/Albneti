import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isEmailConfigured, sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import {
  verifyGoogleToken,
  verifyAppleToken,
  findOrCreateOAuthUser,
  isGoogleOAuthConfigured,
  isAppleOAuthConfigured,
} from '../utils/oauth.js';

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'https://albneti.vercel.app').replace(/\/$/, '');
}

function getApiPublicUrl() {
  return (
    process.env.API_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://albneti-api.onrender.com'
  ).replace(/\/$/, '');
}

async function verifyUserFromToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return { ok: false, error: 'missing' };
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() },
  });
  if (!user) return { ok: false, error: 'invalid' };
  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();
  return { ok: true, user };
}

const sendTokenResponse = (user, res, statusCode = 200) => {
  if (!user.emailVerified) {
    res.cookie('token', '', { maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return res.status(403).json({
      message: 'Verifikoni email-in përpara se të kyçeni. Kontrolloni inbox-in (edhe spam).',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }
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
      emailVerified: !!user.emailVerified,
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
    if (!req.body.acceptedTerms) {
      return res.status(400).json({
        message: 'Duhet të pranoni Kushtet e Përdorimit dhe Politikën e Privatësisë.',
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

    let emailSent = false;
    try {
      const result = await sendVerificationEmail(user.email, verificationToken, user.username);
      emailSent = !!result?.ok;
      if (!emailSent) {
        // eslint-disable-next-line no-console
        console.error('sendVerificationEmail failed:', result?.error || 'unknown');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('sendVerificationEmail threw:', e?.message || e);
    }

    res.cookie('token', '', { maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.status(201).json({
      success: true,
      needsVerification: true,
      email: user.email,
      emailSent,
      message: emailSent
        ? 'Llogaria u krijua. Kontrolloni email-in për të verifikuar llogarinë.'
        : 'Llogaria u krijua por email-i nuk u dërgua. Përdorni "Dërgo përsëri" më poshtë.',
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
    if (!user.password) {
      const provider = user.googleId ? 'Google' : user.appleId ? 'Apple' : 'Google ose Apple';
      return res.status(401).json({ message: `Kyçuni me ${provider}.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i gabuar.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Verifikoni email-in përpara se të kyçeni. Kontrolloni inbox-in (edhe spam).',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
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
    const result = await verifyUserFromToken(token);
    if (!result.ok) {
      return res.status(400).json({ message: 'Linku i verifikimit është i pavlefshëm ose ka skaduar.' });
    }
    sendTokenResponse(result.user, res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë verifikimit.' });
  }
};

/**
 * Verifikim me 1 klik nga email (GET) – kthen faqe HTML (funksionon në Gmail/Outlook)
 */
function buildVerifyHtmlPage({ title, message, buttonLabel, buttonHref, autoRedirectMs = 0, script = '' }) {
  const refresh = autoRedirectMs > 0
    ? `<meta http-equiv="refresh" content="${Math.ceil(autoRedirectMs / 1000)};url=${buttonHref}">`
    : '';
  return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  ${refresh}
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f5f5f5; margin:0; padding:24px; }
    .card { max-width:420px; margin:40px auto; background:#fff; border-radius:12px; padding:32px; text-align:center; box-shadow:0 2px 12px rgba(0,0,0,.08); }
    h1 { font-size:22px; color:#262626; margin:0 0 12px; }
    p { color:#555; font-size:15px; line-height:1.5; margin:0 0 20px; }
    a.btn { display:inline-block; background:#0095f6; color:#fff !important; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:600; font-size:15px; }
    .muted { font-size:13px; color:#888; margin-top:16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="${buttonHref}">${buttonLabel}</a>
    <p class="muted">AlbNet</p>
  </div>
  ${script}
</body>
</html>`;
}

function buildAuthStorageScript(user, accessToken) {
  const payload = {
    state: {
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        emailVerified: true,
      },
      token: accessToken,
    },
    version: 0,
  };
  const feed = `${getFrontendUrl()}/feed`;
  return `<script>
(function(){
  try {
    localStorage.setItem('token', ${JSON.stringify(accessToken)});
    localStorage.setItem('albnet-auth', ${JSON.stringify(JSON.stringify(payload))});
  } catch (e) {}
  setTimeout(function(){ window.location.replace(${JSON.stringify(feed)}); }, 1200);
})();
</script>`;
}

export const verifyEmailLink = async (req, res) => {
  const frontend = getFrontendUrl();
  try {
    const result = await verifyUserFromToken(req.query.token);
    if (!result.ok) {
      const errPage = buildVerifyHtmlPage({
        title: 'Linku skadoi',
        message: 'Linku i verifikimit është i pavlefshëm ose ka skaduar. Kërkoni një email të ri verifikimi.',
        buttonLabel: 'Kërko email të ri',
        buttonHref: `${frontend}/prit-verifikimin`,
      });
      return res.status(400).type('html').send(errPage);
    }
    const user = result.user;
    const accessToken = createToken(user._id);
    const feedUrl = `${frontend}/feed`;
    const successPage = buildVerifyHtmlPage({
      title: 'Llogaria u verifikua',
      message: `Përshëndetje ${user.username}, email-i u konfirmua. Po ju ridrejtojmë në AlbNet...`,
      buttonLabel: 'Hap AlbNet',
      buttonHref: feedUrl,
      autoRedirectMs: 2000,
      script: buildAuthStorageScript(user, accessToken),
    });
    return res.status(200).type('html').send(successPage);
  } catch (err) {
    const errPage = buildVerifyHtmlPage({
      title: 'Gabim',
      message: 'Ndodhi një gabim gjatë verifikimit. Provoni përsëri ose kërkoni email të ri.',
      buttonLabel: 'Kthehu te kyçja',
      buttonHref: `${frontend}/kycu`,
    });
    return res.status(500).type('html').send(errPage);
  }
};

/**
 * Dërgo sërish email verifikimi (nëse llogaria s'është verifikuar ende)
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Vendosni email-in e llogarisë.' });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Dërgimi i email-it nuk është konfiguruar ende.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        success: true,
        message: 'Nëse llogaria ekziston, do të merrni një email verifikimi.',
      });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email-i është verifikuar tashmë. Mund të kyçeni.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const result = await sendVerificationEmail(user.email, verificationToken, user.username);
    if (!result?.ok) {
      return res.status(503).json({
        message: 'Email-i nuk u dërgua. Provoni përsëri pas pak.',
        error: result?.error,
      });
    }

    res.json({
      success: true,
      message: 'Email verifikimi u dërgua. Kontrolloni inbox-in (edhe dosjen Spam).',
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë dërgimit.' });
  }
};

export const emailStatus = async (req, res) => {
  try {
    const email = String(req.query.email || req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Vendosni email-in.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, exists: false, emailVerified: false, emailConfigured: isEmailConfigured() });
    }
    res.json({
      success: true,
      exists: true,
      emailVerified: !!user.emailVerified,
      emailConfigured: isEmailConfigured(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
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
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    sendTokenResponse(user, res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Kyçje me Google (ID token nga frontend)
 */
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Mungon token-i i Google.' });
    }
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({ message: 'Kyçja me Google nuk është aktivizuar ende.' });
    }
    const profile = await verifyGoogleToken(credential);
    const user = await findOrCreateOAuthUser({
      provider: 'google',
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      emailVerified: profile.emailVerified,
    });
    sendTokenResponse(user, res);
  } catch (err) {
    res.status(401).json({ message: err.message || 'Kyçja me Google dështoi.' });
  }
};

/**
 * Kyçje me Apple (identity token nga frontend)
 */
export const appleLogin = async (req, res) => {
  try {
    const { identityToken, fullName } = req.body;
    if (!identityToken) {
      return res.status(400).json({ message: 'Mungon token-i i Apple.' });
    }
    if (!isAppleOAuthConfigured()) {
      return res.status(503).json({ message: 'Kyçja me Apple nuk është aktivizuar ende.' });
    }
    const profile = await verifyAppleToken(identityToken);
    const name = fullName
      ? [
          fullName.givenName || fullName.firstName,
          fullName.familyName || fullName.lastName,
        ]
          .filter(Boolean)
          .join(' ')
      : '';
    const user = await findOrCreateOAuthUser({
      provider: 'apple',
      providerId: profile.providerId,
      email: profile.email,
      name,
      avatar: '',
      emailVerified: profile.emailVerified,
    });
    sendTokenResponse(user, res);
  } catch (err) {
    res.status(401).json({ message: err.message || 'Kyçja me Apple dështoi.' });
  }
};

/**
 * Status i OAuth providers (për frontend)
 */
export const oauthStatus = async (_req, res) => {
  res.json({
    google: isGoogleOAuthConfigured(),
    apple: isAppleOAuthConfigured(),
  });
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
