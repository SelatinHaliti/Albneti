/**
 * AlbNet AI Marketing – gjeneron përmbajtje marketing në shqip.
 * Përdor Gemini/OpenAI kur ka API key; përndryshe motor inteligjent lokal me të dhëna reale.
 */

const ALLOWED_PATHS = new Set([
  '/feed', '/live/nis', '/live', '/reels', '/komuniteti', '/mesazhe',
  '/verifikim', '/explore', '/chat-global', '/krijo/story', '/shkarko',
  '/njoftime', '/profili/miq-te-ngushte',
]);

const FEATURE_POOL = [
  { emoji: '🔴', title: 'Nis Live', desc: 'Transmeto live, merr komente në kohë reale dhe lidhu me audiencën shqiptare.', cta: 'Nis transmetim', path: '/live/nis' },
  { emoji: '🎬', title: 'Reels & Duet', desc: 'Krijo video vertikale me muzikë, duet dhe hashtag trending.', cta: 'Shiko Reels', path: '/reels' },
  { emoji: '🇦🇱', title: 'Komuniteti', desc: 'Evente diaspora, festa dhe takime – gjithçka për shqiptarët kudo.', cta: 'Eksploro', path: '/komuniteti' },
  { emoji: '💬', title: 'Mesazhe & Thirrje', desc: 'DM, grupe, voice notes dhe thirrje audio/video falas.', cta: 'Hap mesazhet', path: '/mesazhe' },
  { emoji: '✓', title: 'Verifikohu', desc: 'Badge blu, besueshmëri dhe prioritet në feed për krijuesit.', cta: 'Verifikohu', path: '/verifikim' },
  { emoji: '📸', title: 'Eksploro', desc: 'Zbulo krijues të rinj, hashtag dhe përmbajtje që po trend-on.', cta: 'Eksploro', path: '/explore' },
  { emoji: '🌍', title: 'Chat Global', desc: 'Bisedo 24/7 me shqiptarë nga çdo vend i botës.', cta: 'Hyr në chat', path: '/chat-global' },
  { emoji: '✨', title: 'Story', desc: 'Ndaj momente me miq ose Close Friends – si Instagram.', cta: 'Krijo story', path: '/krijo/story' },
  { emoji: '📲', title: 'Shkarko AlbNet', desc: 'Instalo si app në telefon – PWA pa App Store.', cta: 'Shkarko', path: '/shkarko' },
  { emoji: '🔔', title: 'Njoftime', desc: 'Merr njoftime kur miqtë postojnë, nisin live ose të ndjekin.', cta: 'Shiko', path: '/njoftime' },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sanitizeFeatures(features) {
  if (!Array.isArray(features)) return FEATURE_POOL.slice(0, 3);
  const cleaned = features
    .filter((f) => f && f.title && f.desc)
    .slice(0, 3)
    .map((f) => ({
      emoji: String(f.emoji || '✨').slice(0, 4),
      title: String(f.title).slice(0, 60),
      desc: String(f.desc).slice(0, 200),
      cta: String(f.cta || 'Shiko').slice(0, 30),
      path: ALLOWED_PATHS.has(f.path) ? f.path : '/feed',
    }));
  return cleaned.length >= 3 ? cleaned : FEATURE_POOL.slice(0, 3);
}

function normalizeTheme(raw, source, model) {
  return {
    id: String(raw?.id || `ai-${Date.now()}`).slice(0, 40),
    subject: String(raw?.subject || '🇦🇱 AlbNet – Rrjeti yt social shqiptar').slice(0, 120),
    headline: String(raw?.headline || 'Mirë se erdhe në AlbNet').slice(0, 100),
    intro: String(raw?.intro || 'Zbulo çfarë po ndodh në komunitetin shqiptar më të madh online.').slice(0, 400),
    urgencyLine: raw?.urgencyLine ? String(raw.urgencyLine).slice(0, 120) : '',
    heroEmoji: String(raw?.heroEmoji || '🇦🇱').slice(0, 4),
    features: sanitizeFeatures(raw?.features),
    aiSource: source,
    aiModel: model,
  };
}

function buildContext(highlights) {
  const lines = [];
  if (highlights?.activeUsers) lines.push(`${highlights.activeUsers} përdorues aktiv këtë javë`);
  if (highlights?.activeLives) lines.push(`${highlights.activeLives} transmetime live aktive tani`);
  if (highlights?.totalUsers) lines.push(`${highlights.totalUsers} përdorues të regjistruar`);
  if (highlights?.trendingPost) {
    const p = highlights.trendingPost;
    lines.push(`Post trending: @${p.user?.username || 'krijues'} – "${(p.caption || '').slice(0, 80)}" (${p.likes?.length || 0} pëlqime)`);
  }
  if (highlights?.upcomingEvent) {
    const e = highlights.upcomingEvent;
    lines.push(`Event i afërt: ${e.title} – ${e.location || e.city || ''}`);
  }
  return lines.join('\n');
}

/** Motor inteligjent lokal – gjeneron marketing dinamik pa API key */
export function generateSmartMarketing(highlights = {}) {
  const users = highlights.activeUsers || highlights.totalUsers || 0;
  const lives = highlights.activeLives || 0;
  const post = highlights.trendingPost;
  const event = highlights.upcomingEvent;
  const likes = post?.likes?.length || 0;
  const creator = post?.user?.username;

  let strategy = 'growth';
  if (lives >= 2) strategy = 'live';
  else if (event) strategy = 'event';
  else if (post && likes >= 3) strategy = 'trending';
  else if (users >= 10) strategy = 'community';

  const eventTitle = event?.title || 'Event shqiptar';
  const eventLocation = event?.location || event?.city || '';
  const creatorName = creator || 'krijues';

  const templates = {
    live: {
      subjects: [
        `🔴 ${lives} LIVE tani në AlbNet – mos i humb!`,
        `🔴 Transmetime live aktive – hyr tani në AlbNet`,
        `🔴 Komuniteti yt është LIVE – lidhu sot`,
      ],
      headlines: [
        'Sot AlbNet është i gjallë – LIVE kudo',
        'Shqiptarët po transmetojnë LIVE tani',
        'Mos humb momentin – hyr në Live',
      ],
      intros: [
        `Aktualisht ka ${lives} transmetim${lives > 1 ? 'e' : ''} live në AlbNet. Hyr, shiko, komento dhe bëhu pjesë e bisedës në kohë reale me komunitetin shqiptar.`,
        `Komuniteti yt po lëviz LIVE. ${users ? `Me ${users} përdorues aktiv këtë javë, ` : ''}tani është koha perfekte për të hyrë dhe për të parë çfarë po ndodh.`,
      ],
      urgency: ['⏱ Transmetimet live nuk presin – hyr tani!', '🔥 Shikuesit po rriten – bashkohu sot'],
      features: [FEATURE_POOL[0], FEATURE_POOL[1], FEATURE_POOL[3]],
      hero: '🔴',
    },
    event: {
      subjects: [
        `🇦🇱 Event i afërt: ${eventTitle} – AlbNet`,
        `📅 ${eventTitle} – mos e humb në Komunitet`,
        `🇦🇱 Diaspora po takohet – ${eventTitle}`,
      ],
      headlines: [
        eventTitle,
        'Komuniteti yt po organizon diçka të veçantë',
        'Event shqiptar i afërt – rezervo vendin',
      ],
      intros: [
        `Në AlbNet Komuniteti po përgatitet për "${eventTitle}"${eventLocation ? ` në ${eventLocation}` : ''}. Bashkohu me shqiptarët, shiko detajet dhe fto miqtë.`,
        `Ngjarja "${eventTitle}" po afrohet. AlbNet është vendi ku diaspora takohet – eksploro eventin dhe bëhu pjesë e komunitetit.`,
      ],
      urgency: ['📅 Vendet mbeten të limituara – shiko detajet tani', '🇦🇱 Eventi po afrohet – konfirmo pjesëmarrjen'],
      features: [FEATURE_POOL[2], FEATURE_POOL[6], FEATURE_POOL[1]],
      hero: '🇦🇱',
    },
    trending: {
      subjects: [
        `🔥 @${creatorName} po trend-on në AlbNet`,
        `🔥 Post me ${likes} pëlqime – shiko çfarë po ndodh`,
        `✨ Krijuesit shqiptarë po lulëzojnë në AlbNet`,
      ],
      headlines: [
        `@${creatorName} po merr vëmendje`,
        'Përmbajtja shqiptare po trend-on',
        'Zbulo çfarë po pëlqehet këtë javë',
      ],
      intros: [
        `Postimi i @${creatorName} po merr ${likes} pëlqime dhe po frymëzon komunitetin. Hyr në AlbNet, shiko reels & feed dhe bëhu pjesë e bisedës.`,
        `Krijuesit shqiptarë po prodhojnë përmbajtje të mrekullueshme. @${creatorName} është një shembull – eksploro, ndiq dhe krijo edhe ti.`,
      ],
      urgency: ['🔥 Trending tani – mos mbet prapa', '✨ Komuniteti po rritet – bashkohu sot'],
      features: [FEATURE_POOL[5], FEATURE_POOL[1], FEATURE_POOL[4]],
      hero: '🔥',
    },
    community: {
      subjects: [
        `🇦🇱 ${users}+ shqiptarë aktiv në AlbNet këtë javë`,
        `💬 Komuniteti shqiptar po rritet – hyr sot`,
        `🌍 AlbNet: ku takohet diaspora online`,
      ],
      headlines: [
        'Komuniteti yt shqiptar po pret',
        'Miqtë të tu janë tashmë këtu',
        'Rrjeti social shqiptar #1',
      ],
      intros: [
        `Me ${users} përdorues aktiv këtë javë, AlbNet është vendi ku shqiptarët lidhen, krijojnë dhe argëtohen. Posto, bisedo, nis live – gjithçka në një app.`,
        `Diaspora, miqtë dhe krijuesit – të gjithë janë në AlbNet. Hyr sot, eksploro feed-in dhe lidhu me komunitetin shqiptar.`,
      ],
      urgency: ['👥 Komuniteti po rritet çdo ditë', '🇦🇱 Bashkohu me valën e re të përdoruesve'],
      features: [FEATURE_POOL[2], FEATURE_POOL[6], FEATURE_POOL[3]],
      hero: '🇦🇱',
    },
    growth: {
      subjects: [
        '✨ AlbNet – rrjeti yt social shqiptar',
        '🇦🇱 Hap AlbNet sot – feed, reels, live & më shumë',
        '💙 AlbNet po të pret – hyr dhe eksploro',
      ],
      headlines: [
        'Mirë se erdhe (sërish) në AlbNet',
        'Gjithçka që të duhet, në një vend',
        'Rrjeti social i krijuar për shqiptarët',
      ],
      intros: [
        'AlbNet është platforma ku shqiptarët postojnë, nisin live, krijojnë reels dhe lidhen me diasporën. Sot është dita perfekte për të hyrë dhe për të parë çfarë ka të re.',
        'Feed, stories, reels, mesazhe, thirrje dhe komunitet – AlbNet i ka të gjitha. Hap app-in dhe zbulo pse mijëra shqiptarë po kalojnë këtu çdo ditë.',
      ],
      urgency: ['✨ Përmbajtje e re çdo ditë – mos humb', '💙 Komuniteti yt po pret'],
      features: [FEATURE_POOL[0], FEATURE_POOL[1], FEATURE_POOL[3]],
      hero: '✨',
    },
  };

  const t = templates[strategy];
  return normalizeTheme(
    {
      id: `smart-${strategy}`,
      subject: pickRandom(t.subjects),
      headline: pickRandom(t.headlines),
      intro: pickRandom(t.intros),
      urgencyLine: pickRandom(t.urgency),
      heroEmoji: t.hero,
      features: t.features,
    },
    'smart',
    'albnet-dynamic-v1'
  );
}

async function callGemini(prompt, model) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1200, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(25000),
    }
  );
  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || '';
    } catch { /* ignore */ }
    const hint =
      res.status === 400 || res.status === 401 || res.status === 403
        ? ' – kontrollo që key është nga aistudio.google.com (fillon me AIzaSy)'
        : res.status === 429
          ? ' – kuota e mbaruar ose key i pavlefshëm'
          : '';
    throw new Error(`Gemini ${res.status}${detail ? `: ${detail}` : ''}${hint}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: përgjigje bosh');
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}

async function callGeminiWithFallback(prompt) {
  const preferred = process.env.AI_MARKETING_MODEL?.trim();
  const models = [...new Set([preferred, 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'].filter(Boolean))];
  let lastErr;
  for (const model of models) {
    try {
      return await callGemini(prompt, model);
    } catch (err) {
      lastErr = err;
      // eslint-disable-next-line no-console
      console.warn(`[AI Marketing] ${model} dështoi:`, err.message);
    }
  }
  throw lastErr || new Error('Gemini: të gjitha modelet dështuan');
}

async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.AI_MARKETING_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Je copywriter marketing për AlbNet, rrjet social shqiptar. Përgjigju vetëm me JSON valid në shqip.' },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI: përgjigje bosh');
  return JSON.parse(text);
}

function buildPrompt(highlights) {
  return `Krijo një email marketing profesional për AlbNet (rrjet social shqiptar si Instagram).

KONTEKST I PLATFORMËS:
${buildContext(highlights)}

Kthe JSON me këto fusha:
{
  "id": "ai-campaign",
  "subject": "subjekt me emoji, max 80 shkronja, tërheqës",
  "headline": "titull i madh emocional",
  "intro": "2-3 fjali bindëse në shqip, ton miqësor",
  "urgencyLine": "1 fjali urgjence/social proof",
  "heroEmoji": "1 emoji",
  "features": [
    {"emoji":"...","title":"...","desc":"...","cta":"...","path":"/feed"},
    {"emoji":"...","title":"...","desc":"...","cta":"...","path":"/reels"},
    {"emoji":"...","title":"...","desc":"...","cta":"...","path":"/komuniteti"}
  ]
}

Rregulla:
- Shkruaj në shqip natyral, jo formal
- path duhet të jetë një nga: /feed, /live/nis, /reels, /komuniteti, /mesazhe, /verifikim, /explore, /chat-global, /krijo/story, /shkarko
- Përmend të dhënat reale nga konteksti kur ka kuptim
- Subjekti duhet të bëjë dikë të klikojë`;
}

export function getAiMarketingStatus() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const gemini = Boolean(geminiKey);
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const geminiKeyLooksValid = geminiKey.startsWith('AIza');
  return {
    enabled: true,
    gemini,
    openai,
    geminiKeyLooksValid,
    provider: gemini ? 'gemini' : openai ? 'openai' : 'smart',
    model: gemini || openai ? (process.env.AI_MARKETING_MODEL || (gemini ? 'gemini-2.0-flash' : 'gpt-4o-mini')) : 'albnet-dynamic-v1',
  };
}

/** Gjeneron temën e marketingut – AI ose motor inteligjent */
export async function generateMarketingTheme(highlights = {}, { fast = false } = {}) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const useSmartOnly =
    fast ||
    process.env.AI_MARKETING_USE_SMART_ONLY === 'true' ||
    (geminiKey && !geminiKey.startsWith('AIza'));

  if (useSmartOnly) {
    return generateSmartMarketing(highlights);
  }

  const prompt = buildPrompt(highlights);
  const model = process.env.AI_MARKETING_MODEL?.trim();

  if (geminiKey) {
    try {
      const raw = await callGeminiWithFallback(prompt);
      const usedModel = model || 'gemini-2.0-flash';
      return normalizeTheme(raw, 'gemini', usedModel);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[AI Marketing] Gemini dështoi, fallback smart:', err.message);
    }
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const raw = await callOpenAI(prompt);
      return normalizeTheme(raw, 'openai', model || 'gpt-4o-mini');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[AI Marketing] OpenAI dështoi, fallback smart:', err.message);
    }
  }

  return generateSmartMarketing(highlights);
}
