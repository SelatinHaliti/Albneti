import User from '../models/User.js';

export async function parseMentionsFromCaption(caption) {
  if (!caption || typeof caption !== 'string') return [];
  const matches = caption.match(/@([a-zA-Z0-9._]{3,30})/g) || [];
  const usernames = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  if (!usernames.length) return [];
  const users = await User.find({ username: { $in: usernames }, isBlocked: false }).select('_id username');
  return users;
}
