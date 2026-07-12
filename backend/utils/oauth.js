import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import User from '../models/User.js';

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && googleClient);
}

export function isAppleOAuthConfigured() {
  return Boolean(process.env.APPLE_CLIENT_ID);
}

export async function verifyGoogleToken(idToken) {
  if (!googleClient) throw new Error('Google OAuth nuk është konfiguruar.');
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Token Google i pavlefshëm.');
  }
  return {
    providerId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.given_name || '',
    avatar: payload.picture || '',
    emailVerified: payload.email_verified === true,
  };
}

export async function verifyAppleToken(identityToken) {
  if (!process.env.APPLE_CLIENT_ID) throw new Error('Apple OAuth nuk është konfiguruar.');
  const payload = await appleSignin.verifyIdToken(identityToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });
  if (!payload?.sub) throw new Error('Token Apple i pavlefshëm.');
  return {
    providerId: payload.sub,
    email: payload.email?.toLowerCase() || '',
    emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
  };
}

async function generateUniqueUsername(base) {
  let username = (base || 'albnet')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
    .slice(0, 20);
  if (username.length < 3) username = `user${username || 'alb'}`;
  let candidate = username;
  let i = 0;
  while (await User.findOne({ username: candidate })) {
    i += 1;
    candidate = `${username}${i}`;
  }
  return candidate;
}

/**
 * Gjen ose krijon përdorues nga OAuth (Google / Apple).
 */
export async function findOrCreateOAuthUser({ provider, providerId, email, name, avatar, emailVerified = false }) {
  const idField = provider === 'google' ? 'googleId' : 'appleId';
  const query = [{ [idField]: providerId }];
  if (email) query.push({ email });

  let user = await User.findOne({ $or: query });

  if (user) {
    if (user.isBlocked) throw new Error('Llogaria juaj është bllokuar.');
    let changed = false;
    if (!user[idField]) {
      user[idField] = providerId;
      changed = true;
    }
    if (avatar && !user.avatar) {
      user.avatar = avatar;
      changed = true;
    }
    if (name && !user.fullName) {
      user.fullName = name.slice(0, 50);
      changed = true;
    }
    if (!user.emailVerified && emailVerified) {
      user.emailVerified = true;
      changed = true;
    }
    if (changed) await user.save();
    return user;
  }

  if (!email) {
    throw new Error('Apple nuk dha email. Provoni përsëri ose përdorni email/fjalëkalim.');
  }

  const emailBase = email.split('@')[0] || 'albnet';
  const username = await generateUniqueUsername(name || emailBase);

  user = await User.create({
    username,
    email,
    password: crypto.randomBytes(32).toString('hex'),
    fullName: (name || '').slice(0, 50),
    avatar: avatar || '',
    [idField]: providerId,
    authProvider: provider,
    emailVerified: !!emailVerified,
  });

  return user;
}
