import Event from '../models/Event.js';
import { COMMUNITY_EVENTS } from '../data/communityEvents.js';

export async function seedCommunityEvents() {
  try {
    for (const ev of COMMUNITY_EVENTS) {
      await Event.findOneAndUpdate(
        { slug: ev.slug },
        { $setOnInsert: { interested: [] }, $set: ev },
        { upsert: true, new: true }
      );
    }
    const count = await Event.countDocuments();
    console.log(`[Komuniteti] ${count} evente në databazë`);
  } catch (err) {
    console.warn('[Komuniteti] Seed eventesh dështoi:', err.message);
  }
}
