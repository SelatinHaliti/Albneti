/**
 * AlbNet Creator Studio – motor i avancuar për krijuesit e videos.
 * Sugjeron ide, hook, skript, caption, hashtag, muzikë dhe kohën e postimit.
 * Funksionon pa AI key; Gemini/OpenAI e personalizojnë kur janë të konfiguruara.
 */

export const NICHES = [
  { id: 'lifestyle', label: 'Lifestyle', emoji: '✨', keywords: ['jetë', 'ditë', 'rutinë', 'grwm', 'vlog', 'mëngjes', 'natë'] },
  { id: 'food', label: 'Ushqim', emoji: '🍽️', keywords: ['ushqim', 'recetë', 'byrek', 'tavë', 'kafe', 'embëlsirë', 'restorant', 'gatim', 'fërgesë', 'fli'] },
  { id: 'comedy', label: 'Komedi', emoji: '😂', keywords: ['humor', 'qesh', 'meme', 'skit', 'ironia', 'qeshim', 'gënjeshtër'] },
  { id: 'music', label: 'Muzikë', emoji: '🎵', keywords: ['këngë', 'muzikë', 'tallava', 'valle', 'koncert', 'karaoke', 'beat'] },
  { id: 'diaspora', label: 'Diaspora', emoji: '🌍', keywords: ['diaspora', 'emigrim', 'zvicër', 'gjermani', 'itali', 'usa', 'malli', 'shtëpi'] },
  { id: 'sports', label: 'Sport', emoji: '⚽', keywords: ['futboll', 'sport', 'ndeshje', 'palestër', 'fitnes', 'stërvitje', 'shqipëria'] },
  { id: 'beauty', label: 'Bukuri', emoji: '💄', keywords: ['makeup', 'bukuri', 'flokë', 'lëkurë', 'outfit', 'stil', 'grimi'] },
  { id: 'education', label: 'Edukim', emoji: '📚', keywords: ['mëso', 'këshillë', 'si të', 'fakt', 'histori', 'gjuhë', 'shkollë'] },
  { id: 'travel', label: 'Udhëtim', emoji: '🧳', keywords: ['udhëtim', 'plazh', 'mal', 'tiranë', 'prishtinë', 'sarandë', 'valbonë', 'vacation'] },
  { id: 'family', label: 'Familje', emoji: '👨‍👩‍👧', keywords: ['familje', 'nënë', 'babë', 'fëmijë', 'dasma', 'gjyshe', 'vëlla'] },
  { id: 'dance', label: 'Valle', emoji: '💃', keywords: ['valle', 'kërcim', 'choreo', 'trend', 'tiktok', 'dance'] },
  { id: 'patriot', label: 'Krenari', emoji: '🇦🇱', keywords: ['shqipëri', 'kosovë', 'flamur', 'skënderbe', 'traditë', 'krenar'] },
  { id: 'business', label: 'Biznes', emoji: '💼', keywords: ['biznes', 'punë', 'start-up', 'para', 'karrierë', 'side hustle'] },
  { id: 'cars', label: 'Makina', emoji: '🚗', keywords: ['makinë', 'auto', 'tuning', 'rrugë', 'drive'] },
];

const FORMATS = [
  { id: 'hook_story_cta', label: 'Hook → histori → CTA', sweetSpot: [9, 18] },
  { id: 'pov', label: 'POV / kamera e parë', sweetSpot: [7, 15] },
  { id: 'tutorial', label: 'Tutorial i shpejtë', sweetSpot: [12, 25] },
  { id: 'day_in_life', label: 'Një ditë me mua', sweetSpot: [15, 30] },
  { id: 'ranking', label: 'Top listë / ranking', sweetSpot: [10, 20] },
  { id: 'duet_react', label: 'Reagim / duet', sweetSpot: [8, 16] },
  { id: 'before_after', label: 'Para & pas', sweetSpot: [8, 14] },
  { id: 'street', label: 'Intervistë rruge', sweetSpot: [12, 22] },
  { id: 'storytelling', label: 'Tregim emocional', sweetSpot: [15, 35] },
  { id: 'text_voiceover', label: 'Tekst + voiceover', sweetSpot: [8, 18] },
];

const IDEA_BANK = [
  { niche: 'lifestyle', format: 'day_in_life', title: 'Mëngjesi im shqiptar në 15 sekonda', hook: 'Nëse zgjohesh kështu, je 100% shqiptar.', beats: ['Hapja: alarmi + dritare', 'Kafe/çaj + recetë e shpejtë', 'Dalja nga shtëpia me tekst në ekran'], cta: 'Ruaje dhe provoje nesër', music: 'chill', difficulty: 'lehtë' },
  { niche: 'lifestyle', format: 'pov', title: 'POV: je në Tiranë të premten në darkë', hook: 'POV: ora 21:00, Blloku, ti dhe banda.', beats: ['Hyrje me hap në rrugë', '3 kënde të shpejta (kafe, njerëz, drita)', 'Mbyllje me pyetje'], cta: 'Ku shkon ti të premten?', music: 'trending', difficulty: 'lehtë' },
  { niche: 'food', format: 'tutorial', title: 'Byrek në 20 sekonda – pa justifikime', hook: 'Nëna ime do të më vriste, por ja receta ime.', beats: ['Përbërësit në tavolinë', '3 hapa të shpejtë', 'Pretja e parë + reaksion'], cta: 'Komento “recetë” nëse e do të plotë', music: 'folk', difficulty: 'mesatar' },
  { niche: 'food', format: 'ranking', title: '3 ushqime shqiptare që të huajt NUK i kuptojnë', hook: 'Numri 3 i bën të gjithë të huajt të ndalen.', beats: ['#3 me tekst të madh', '#2 twist', '#1 surprise + CTA'], cta: 'Cilin do ta mbroje ti?', music: 'shqip', difficulty: 'lehtë' },
  { niche: 'comedy', format: 'hook_story_cta', title: 'Kur nëna të telefonon “vetëm 2 minuta”', hook: 'Gënjeshtër e madhe: “vetëm 2 minuta”.', beats: ['Setup: telefoni bie', 'Eskalim: 14 tema', 'Punchline + tekst në ekran'], cta: 'Ndaje me nënën (nëse guxon)', music: 'trending', difficulty: 'lehtë' },
  { niche: 'comedy', format: 'duet_react', title: 'Reagim: “sa kushton jeta në Shqipëri”', hook: 'Njerëzit jashtë thonë këtë… unë them këtë.', beats: ['Klipe të huaja (tekst)', 'Prerja jote me të vërtetën', 'Listë 3 çmimesh reale'], cta: 'Sa paguan ti për kafe?', music: 'hiphop', difficulty: 'mesatar' },
  { niche: 'music', format: 'text_voiceover', title: 'Kënga që të kthen menjëherë në 2012', hook: 'Nëse e njeh këtë beat, ke jetuar.', beats: ['Beat drop + tekst nostalgjik', '3 kujtime flash', 'Kërkesë për këngën në komente'], cta: 'Emërto këngën në komente', music: 'shqip', difficulty: 'lehtë' },
  { niche: 'music', format: 'pov', title: 'Valle popullore vs. klubi i Tiranës', hook: 'E njëjta këngë. Dy bota.', beats: ['Split screen folklor', 'Split screen klub', 'Bashkimi në fund'], cta: 'Cila palë je ti?', music: 'shqip', difficulty: 'mesatar' },
  { niche: 'diaspora', format: 'storytelling', title: 'Telefonata e parë kur mbërrita jashtë', hook: 'Dita që u bëra “diaspora”.', beats: ['Aeroporti / valixhja', 'Telefonata me familjen', 'Tani vs. atëherë'], cta: 'Ku je ti tani?', music: 'ambient', difficulty: 'mesatar' },
  { niche: 'diaspora', format: 'ranking', title: '5 gjëra që i do vetëm kur largohesh', hook: 'Askush nuk e do fliun si diaspora.', beats: ['5, 4, 3 countdown', 'Nr. 1 emocional', 'CTA për mall'], cta: 'Çfarë të mungon ty?', music: 'folk', difficulty: 'lehtë' },
  { niche: 'sports', format: 'hook_story_cta', title: 'Kur Shqipëria shënon – kamera jote', hook: 'Zemra ime në sekondën e golit.', beats: ['Tensioni para golit', 'Goli + kërcim', 'Përqafimi / bërtitja'], cta: 'Ku e ke parë ndeshjen?', music: 'trending', difficulty: 'lehtë' },
  { niche: 'sports', format: 'tutorial', title: 'Stërvitja 8-minëshe pa palestër', hook: 'Nuk ke kohë? Ke 8 minuta.', beats: ['Warm-up 10s', '3 ushtrime', 'Rezultati / djersa'], cta: 'Provoje dhe shënoje “u bë”', music: 'elektro', difficulty: 'mesatar' },
  { niche: 'beauty', format: 'before_after', title: 'Makeup 30 sekonda: ditë vs. natë', hook: 'I njëjti fytyrë. Dy energia.', beats: ['Para (dritë natyrale)', 'Transformimi i shpejtë', 'Pas + outfit'], cta: 'Cilin look mban?', music: 'pop', difficulty: 'mesatar' },
  { niche: 'beauty', format: 'tutorial', title: '3 gabime makeup që i bëjmë të gjithë', hook: 'E bëja këtë çdo ditë. Gabim.', beats: ['Gabimi 1 me X', 'Gabimi 2', 'Zgjidhja e shpejtë'], cta: 'Ruaje për herën tjetër', music: 'chill', difficulty: 'lehtë' },
  { niche: 'education', format: 'text_voiceover', title: 'Fjalë shqipe që po humbasin', hook: 'Gjyshja ime e thotë këtë. Ti?', beats: ['Fjala 1 + kuptimi', 'Fjala 2', 'Sfida: përdore sot'], cta: 'Shto një fjalë që e di ti', music: 'ambient', difficulty: 'lehtë' },
  { niche: 'education', format: 'tutorial', title: 'Si të postosh Reel që njerëzit e shohin deri në fund', hook: '90% end aty. Ja pse.', beats: ['Hook i keq vs i mirë', 'Ritmi i prerjeve', 'CTA e qartë'], cta: 'Provoje te videoja jote e radhës', music: 'elektro', difficulty: 'pro' },
  { niche: 'travel', format: 'pov', title: '24 orë në qytetin tënd – versioni turist', hook: 'E kam jetuar këtu, por kurrë kështu.', beats: ['Mëngjes lokal', 'Vendi sekret', 'Perëndimi'], cta: 'Çfarë të mos humbas?', music: 'summer', difficulty: 'mesatar' },
  { niche: 'travel', format: 'ranking', title: '3 plazhe shqiptare që Instagrami i ka harruar', hook: 'Jo Durrës. Jo Sarandë. Këto.', beats: ['#3 reveal', '#2', '#1 me arsye'], cta: 'Cilin e njeh?', music: 'summer', difficulty: 'lehtë' },
  { niche: 'family', format: 'storytelling', title: 'Gjëja që më tha gjyshja dhe s’e harroj', hook: 'Ajo e tha një herë. Më ndryshoi.', beats: ['Kujtimi', 'Kuptimi tani', 'Mesazhi për ty'], cta: 'Çfarë të tha ty familja?', music: 'folk', difficulty: 'mesatar' },
  { niche: 'family', format: 'day_in_life', title: 'E diela te ne – pa filtra', hook: 'E diela shqiptare nuk ka “plan B”.', beats: ['Mëngjesi i gjatë', 'Tryeza', 'Kaosi i bukur'], cta: 'Si është e diela te ju?', music: 'shqip', difficulty: 'lehtë' },
  { niche: 'dance', format: 'pov', title: 'Mëso këtë valle për 12 sekonda', hook: 'Nëse e mësove, je i ftuar në dasmë.', beats: ['Hapi 1 ngadalë', 'Hapi 2', 'Së bashku me muzikë'], cta: 'Duet me këtë video', music: 'shqip', difficulty: 'mesatar' },
  { niche: 'dance', format: 'duet_react', title: 'Trendi i javës – versioni shqiptar', hook: 'Të gjithë e bëjnë kështu. Unë kështu.', beats: ['Trendi origjinal', 'Twist shqiptar', 'Call për duet'], cta: 'Bëje duet', music: 'trending', difficulty: 'lehtë' },
  { niche: 'patriot', format: 'text_voiceover', title: '5 arsye pse jam krenar që jam shqiptar', hook: 'Jo folklor. Të vërteta.', beats: ['Arsye 1-2 të shpejta', 'Arsye emocionale', 'Flamuri / CTA'], cta: 'Shto arsyen tënde', music: 'folk', difficulty: 'lehtë' },
  { niche: 'patriot', format: 'hook_story_cta', title: 'Kur dëgjon shqip në një vend të huaj', hook: 'Në metro. Një fjalë. Gjithçka ndryshon.', beats: ['Vend i huaj', 'Zëri shqip', 'Buzëqeshja / lidhja'], cta: 'Ku e ke dëgjuar ti?', music: 'ambient', difficulty: 'lehtë' },
  { niche: 'business', format: 'tutorial', title: 'Si e nisa anën time të të ardhurave', hook: 'Nuk prisja pagën. Bëra këtë.', beats: ['Problemi', 'Hapi i parë', 'Rezultati i vogël'], cta: 'Ruaje dhe nise sot', music: 'elektro', difficulty: 'pro' },
  { niche: 'business', format: 'text_voiceover', title: '3 gabime që i bëra në punën e parë', hook: 'I bëra që t’i mos i bësh ti.', beats: ['Gabimi', 'Çmimi', 'Mësimi'], cta: 'Cilin e ke bërë?', music: 'chill', difficulty: 'mesatar' },
  { niche: 'cars', format: 'pov', title: 'Nata në autostradë me këtë këngë', hook: 'Kjo këngë + kjo rrugë = terapi.', beats: ['Nisja', 'Ritmi i rrugës', 'Qyteti në horizont'], cta: 'Çfarë kënge vë ti natën?', music: 'rnb', difficulty: 'lehtë' },
  { niche: 'lifestyle', format: 'before_after', title: 'Dhoma ime: 10 minuta para / pas', hook: 'Nuk të duhet motivim. Të duhet 10 minuta.', beats: ['Kaosi', 'Timelapse', 'Rezultati + ndjenja'], cta: 'Provoje sot, pa e njoftuar askënd', music: 'pop', difficulty: 'lehtë' },
];

const CULTURAL_CALENDAR = [
  { month: 1, day: 1, title: 'Viti i Ri', hook: 'Viti i ri, por unë jam i njëjti… pothuajse.', niche: 'lifestyle' },
  { month: 3, day: 7, title: 'Dita e Mësuesit', hook: 'Mësuesi që më ndryshoi jetën, në 15 sekonda.', niche: 'education' },
  { month: 3, day: 8, title: 'Dita e Gruas', hook: 'Jo lule. Kjo video.', niche: 'family' },
  { month: 3, day: 14, title: 'Verëza / Dita e Verës', hook: 'Shqiptarët e dinë. Të tjerët pyesin.', niche: 'patriot' },
  { month: 4, day: 1, title: '1 Prill / pranvera', hook: 'Pranvera nisi, unë ende me xhaketë.', niche: 'comedy' },
  { month: 5, day: 1, title: '1 Maj', hook: 'Pushim? Apo “pushim” shqiptar.', niche: 'lifestyle' },
  { month: 6, day: 1, title: 'Fillimi i verës', hook: 'Plazhi po të pret. Ti po pret pagën.', niche: 'travel' },
  { month: 7, day: 15, title: 'Sezoni i dasmave', hook: 'Nëse ke valle, ke ftesë.', niche: 'dance' },
  { month: 8, day: 5, title: 'Gushti i kuq', hook: 'Gusht = diaspora kthehet në shtëpi.', niche: 'diaspora' },
  { month: 9, day: 1, title: 'Fillimi i shkollës / vjeshta', hook: 'Shtatori: kafe më e fortë, ëndrra më të mëdha.', niche: 'education' },
  { month: 9, day: 5, title: 'Nëna Terezë', hook: 'Një fjali e saj që më ndjek ende.', niche: 'education' },
  { month: 10, day: 19, title: 'Nëntori po vjen – krenaria', hook: 'Po përgatitem për 28 Nëntorin. Ti?', niche: 'patriot' },
  { month: 11, day: 28, title: 'Dita e Flamurit', hook: '28 Nëntor nuk është post. Është gjak.', niche: 'patriot' },
  { month: 11, day: 29, title: 'Çlirimi', hook: 'Dje flamuri. Sot kujtesa.', niche: 'patriot' },
  { month: 12, day: 8, title: 'Dita e Rinisë', hook: 'Rinia shqiptare nuk pret leje.', niche: 'lifestyle' },
  { month: 12, day: 24, title: 'Krishtlindjet', hook: 'Tryeza jonë nuk ka “mjafton”.', niche: 'family' },
  { month: 12, day: 31, title: 'Silenat', hook: '12 rrush. 12 dëshira. 1 e vërtetë.', niche: 'lifestyle' },
];

const DEFAULT_WINDOWS = [
  { label: 'Pas pune (CET)', hours: '18:30–21:30', why: 'Shqiptarët në Ballkan dhe Evropë janë online pas punës.', score: 96 },
  { label: 'Pushimi i drekës', hours: '12:00–13:30', why: 'Scroll i shpejtë – hook-u yt duhet të jetë në 1.5s.', score: 78 },
  { label: 'Fundjavë natë', hours: 'Sht 20:00–23:00', why: 'Reels dhe muzikë performojnë më mirë kur njerëzit kanë kohë.', score: 88 },
  { label: 'Diaspora US (mbrëmje atje)', hours: '01:00–03:00 CET', why: 'Shqiptarët në SHBA/Kanada janë në feed-in e mbrëmjes.', score: 64 },
];

const TONE_CTA = {
  viral: ['Ruaje këtë', 'Ndaje para se ta fshijë algoritmi', 'Komento nëse e njeh'],
  emotional: ['Kjo ishte për ty', 'Ruaje për ditën që të duhet', 'Tregoji dikujt që e do'],
  funny: ['Ndaje me personin që e bën këtë', 'Mos ia trego nënës', 'Tag një mik që qesh kështu'],
  professional: ['Ruaje për më vonë', 'Ndiq për pjesën 2', 'Shkruaj “dua” për detajet'],
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hashString(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = hashString(seed) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick(arr, seed, index = 0) {
  if (!arr.length) return null;
  const shuffled = seededShuffle(arr, `${seed}:${index}`);
  return shuffled[0];
}

function unique(list) {
  const seen = new Set();
  return list.filter((x) => {
    const k = String(x || '').trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function detectNiche(text = '', hashtags = [], bio = '') {
  const blob = `${text} ${(hashtags || []).join(' ')} ${bio}`.toLowerCase();
  let best = NICHES[0];
  let bestScore = 0;
  for (const niche of NICHES) {
    const score = niche.keywords.reduce((acc, kw) => acc + (blob.includes(kw) ? 2 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = niche;
    }
  }
  return { ...best, confidence: clamp(bestScore * 12, 18, 96) };
}

export function culturalMoments(now = new Date()) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const nearby = CULTURAL_CALENDAR
    .map((c) => {
      const dist = Math.abs((c.month - month) * 30 + (c.day - day));
      return { ...c, dist };
    })
    .filter((c) => c.dist <= 18)
    .sort((a, b) => a.dist - b.dist);
  if (nearby.length) return nearby.slice(0, 3);
  return CULTURAL_CALENDAR.filter((c) => c.month === month).slice(0, 2);
}

export function scoreVirality({ format, durationSec, hashtagHits = 0, cultural = false, hasQuestion = false, musicTrending = false }) {
  let score = 42;
  if (format === 'hook_story_cta' || format === 'pov') score += 14;
  if (format === 'ranking' || format === 'duet_react') score += 10;
  if (durationSec >= 7 && durationSec <= 18) score += 16;
  else if (durationSec <= 30) score += 8;
  score += clamp(hashtagHits * 7, 0, 21);
  if (cultural) score += 12;
  if (hasQuestion) score += 8;
  if (musicTrending) score += 7;
  return clamp(Math.round(score), 32, 98);
}

function formatMeta(formatId) {
  return FORMATS.find((f) => f.id === formatId) || FORMATS[0];
}

function nicheMeta(nicheId) {
  return NICHES.find((n) => n.id === nicheId) || NICHES[0];
}

function mergeHashtags(base, trending = [], nicheId) {
  const nicheTag = {
    lifestyle: ['rutina', 'jetaime'],
    food: ['receta', 'ushqimshqiptar'],
    comedy: ['humorshqip', 'qeshim'],
    music: ['muzikeshqip', 'kenga'],
    diaspora: ['diaspora', 'malli'],
    sports: ['futboll', 'shqipëria'],
    beauty: ['makeup', 'stil'],
    education: ['mëso', 'këshilla'],
    travel: ['udhetim', 'shqiperia'],
    family: ['familja', 'tradita'],
    dance: ['valle', 'dasma'],
    patriot: ['shqiperi', 'kosove'],
    business: ['biznes', 'puna'],
    cars: ['makina', 'rruga'],
  };
  const trend = (trending || []).map((t) => (typeof t === 'string' ? t : t.tag)).filter(Boolean);
  return unique([
    ...(base || []),
    ...(nicheTag[nicheId] || []),
    ...trend.slice(0, 3),
    'albnet',
    'reels',
  ]).slice(0, 8);
}

function buildCaption(idea, extra = '') {
  const q = extra ? ` ${extra.trim()}` : '';
  return `${idea.hook}${q}\n\n${idea.cta} 👇`;
}

export function buildIdeaCard(template, ctx = {}) {
  const fmt = formatMeta(template.format);
  const niche = nicheMeta(template.niche);
  const durationSec = Math.round((fmt.sweetSpot[0] + fmt.sweetSpot[1]) / 2);
  const cultural = Boolean(ctx.cultural);
  const hashtags = mergeHashtags(
    [niche.id, template.format.replace(/_/g, '')],
    ctx.trendingHashtags,
    template.niche
  );
  const hasQuestion = /[?？]/.test(template.hook + template.cta);
  const virality = scoreVirality({
    format: template.format,
    durationSec,
    hashtagHits: hashtags.filter((h) => (ctx.trendingHashtags || []).some((t) => String(t.tag || t).toLowerCase() === h)).length,
    cultural,
    hasQuestion,
    musicTrending: template.music === 'trending' || template.music === 'shqip',
  });
  const script = (template.beats || []).map((action, i) => ({
    t: i === 0 ? '0–3s' : i === 1 ? '3–10s' : '10s–fund',
    action,
  }));
  return {
    id: `idea-${template.niche}-${template.format}-${hashString(template.title).toString(36)}`,
    niche: template.niche,
    nicheLabel: `${niche.emoji} ${niche.label}`,
    format: template.format,
    formatLabel: fmt.label,
    title: template.title,
    hook: template.hook,
    script,
    caption: buildCaption(template, ctx.captionHint),
    hashtags,
    durationSec,
    musicVibe: template.music,
    cta: template.cta,
    virality,
    why: cultural
      ? 'Përputhet me momentin kulturor të javës – algoritmi e do përmbajtjen në kohë.'
      : `Formati “${fmt.label}” mban njerëzit deri në fund. Hook-u në 3 sekondat e para është çelësi.`,
    difficulty: template.difficulty || 'lehtë',
    shots: script.length,
  };
}

export function selectIdeas({ nicheId, seed, trendingHashtags = [], cultural = [], limit = 6, captionHint = '' } = {}) {
  const culturalNiche = cultural[0]?.niche;
  const nichePool = nicheId ? IDEA_BANK.filter((i) => i.niche === nicheId) : [];
  const rest = IDEA_BANK.filter((i) => i.niche !== nicheId);
  const ordered = [
    ...seededShuffle(nichePool, `${seed || 'albnet'}:n`),
    ...seededShuffle(rest.filter((i) => i.niche === culturalNiche), `${seed || 'albnet'}:c`),
    ...seededShuffle(rest.filter((i) => i.niche !== culturalNiche), `${seed || 'albnet'}:r`),
  ];
  const seen = new Set();
  const uniqueTpl = ordered.filter((tpl) => {
    if (seen.has(tpl.title)) return false;
    seen.add(tpl.title);
    return true;
  });
  return uniqueTpl.slice(0, limit).map((tpl, idx) =>
    buildIdeaCard(tpl, {
      trendingHashtags,
      cultural: Boolean(culturalNiche && tpl.niche === culturalNiche) || (idx === 0 && cultural.length > 0),
      captionHint,
    })
  );
}

export function rewriteCaptionLocal({ caption = '', tone = 'viral', trendingHashtags = [], nicheId } = {}) {
  const clean = String(caption || '').trim();
  const niche = detectNiche(clean, [], '');
  const id = nicheId || niche.id;
  const hooks = {
    viral: [
      'Ndal. Duhet ta shohësh këtë.',
      'E bëra këtë dhe tani e kuptoj.',
      'Nëse e scroll-on, do ta kërkosh nesër.',
    ],
    emotional: [
      'Nuk e dija që do të më mungonte kaq shumë.',
      'Kjo është për ty që je larg.',
      'E ruajta këtë moment sepse nuk kthehet.',
    ],
    funny: [
      'Unë, duke u sjellë normalisht:',
      'Askush: … Unë:',
      'Plotësisht e panevojshme, por ja:',
    ],
    professional: [
      '3 gjëra që mësova duke e bërë këtë.',
      'Ja metoda ime, pa filter.',
      'Nëse do rezultate, nisu këtu.',
    ],
  };
  const hookList = hooks[tone] || hooks.viral;
  const cta = pick(TONE_CTA[tone] || TONE_CTA.viral, clean || tone);
  const body = clean
    ? clean.replace(/\s+/g, ' ').slice(0, 180)
    : 'Një moment i vërtetë, pa e tepruar. Shiko deri në fund.';
  const hashtags = mergeHashtags([], trendingHashtags, id);
  const variants = hookList.slice(0, 3).map((hook, i) => ({
    id: `cap-${tone}-${i}`,
    tone,
    hook,
    caption: `${hook}\n\n${body}\n\n${cta} 👇`,
    hashtags,
    cta,
  }));
  return { niche: { id, label: niche.label, emoji: niche.emoji }, variants };
}

export function analyzePosts(posts = []) {
  const list = Array.isArray(posts) ? posts : [];
  const videos = list.filter((p) => p.type === 'reel' || p.type === 'video' || (p.media || []).some((m) => m.type === 'video'));
  const likes = list.map((p) => (p.likes?.length || p.likeCount || 0));
  const comments = list.map((p) => (Array.isArray(p.comments) ? p.comments.length : p.commentCount || 0));
  const avgLikes = list.length ? likes.reduce((a, b) => a + b, 0) / list.length : 0;
  const avgComments = list.length ? comments.reduce((a, b) => a + b, 0) / list.length : 0;
  const hourHits = Array(24).fill(0);
  const hourEng = Array(24).fill(0);
  const tagCount = {};
  for (const p of list) {
    const h = new Date(p.createdAt || Date.now()).getHours();
    const eng = (p.likes?.length || 0) + (Array.isArray(p.comments) ? p.comments.length * 2 : 0);
    hourHits[h] += 1;
    hourEng[h] += eng;
    for (const t of p.hashtags || []) {
      const k = String(t).replace(/^#/, '').toLowerCase();
      if (k) tagCount[k] = (tagCount[k] || 0) + 1;
    }
  }
  const topHours = hourEng
    .map((eng, hour) => ({ hour, eng, count: hourHits[hour] }))
    .sort((a, b) => b.eng - a.eng)
    .slice(0, 3)
    .filter((x) => x.count > 0);
  const topHashtags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));
  const lastPost = list[0]?.createdAt ? new Date(list[0].createdAt) : null;
  const daysSince = lastPost ? Math.max(0, Math.round((Date.now() - lastPost.getTime()) / 86400000)) : null;
  return {
    total: list.length,
    videos: videos.length,
    photoShare: list.length ? Math.round(((list.length - videos.length) / list.length) * 100) : 0,
    avgLikes: Math.round(avgLikes * 10) / 10,
    avgComments: Math.round(avgComments * 10) / 10,
    topHours,
    topHashtags,
    daysSince,
    videoRatio: list.length ? Math.round((videos.length / list.length) * 100) : 0,
  };
}

export function creatorLevel(insights, followers = 0) {
  const score =
    clamp(insights.total * 4, 0, 28) +
    clamp(insights.videoRatio, 0, 24) +
    clamp(insights.avgLikes * 3, 0, 24) +
    clamp(followers / 8, 0, 16) +
    (insights.daysSince != null && insights.daysSince <= 3 ? 8 : insights.daysSince != null && insights.daysSince <= 7 ? 4 : 0);
  const value = clamp(Math.round(score), 8, 99);
  let level = 'Nisje';
  let next = 'Posto 3 Reels këtë javë me hook në 3 sekondat e para.';
  if (value >= 72) {
    level = 'Krijues i vendosur';
    next = 'Bëj seri: e njëjta temë, 5 video. Algoritmi do konsistencën.';
  } else if (value >= 48) {
    level = 'Në ngritje';
    next = 'Shto CTA dhe hashtag trending. Duet me një Reel që po shkon mirë.';
  } else if (value >= 28) {
    level = 'Po nxehet';
    next = 'Kalo nga foto në video. Reels të shkurtra (8–15s) rritin shikimet.';
  }
  return { score: value, level, next };
}

export function getBestPostingWindows(insights) {
  if (insights?.topHours?.length) {
    const personalized = insights.topHours.map((h) => ({
      label: `Ora jote e artë: ${String(h.hour).padStart(2, '0')}:00`,
      hours: `${String(h.hour).padStart(2, '0')}:00–${String((h.hour + 1) % 24).padStart(2, '0')}:00`,
      why: 'Bazuar te pëlqimet dhe komentet e postimeve të tua.',
      score: clamp(70 + h.eng, 70, 99),
      personal: true,
    }));
    return [...personalized, ...DEFAULT_WINDOWS.filter((w) => !w.label.includes('artë'))].slice(0, 4);
  }
  return DEFAULT_WINDOWS;
}

export function buildCalendar(now = new Date(), seed = 'cal', trendingHashtags = []) {
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const moments = culturalMoments(d);
    const ideas = selectIdeas({
      seed: `${seed}:${d.toISOString().slice(0, 10)}`,
      trendingHashtags,
      cultural: moments,
      limit: 1,
    });
    days.push({
      date: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString('sq-AL', { weekday: 'short' }),
      label: i === 0 ? 'Sot' : i === 1 ? 'Nesër' : d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' }),
      moment: moments[0] || null,
      idea: ideas[0] || null,
    });
  }
  return days;
}

export function buildStudioPayload({
  user = {},
  posts = [],
  trendingHashtags = [],
  now = new Date(),
  nicheId,
} = {}) {
  const insightsRaw = analyzePosts(posts);
  const followers = Array.isArray(user.followers) ? user.followers.length : user.followersCount || 0;
  const level = creatorLevel(insightsRaw, followers);
  const detected = detectNiche(
    `${user.bio || ''} ${(posts[0]?.caption || '')}`,
    insightsRaw.topHashtags.map((t) => t.tag),
    user.bio || ''
  );
  const niche = nicheId || detected.id;
  const cultural = culturalMoments(now);
  const seed = `${user._id || user.id || user.username || 'guest'}:${now.toISOString().slice(0, 10)}`;
  const ideas = selectIdeas({
    nicheId: niche,
    seed,
    trendingHashtags,
    cultural,
    limit: 8,
  });
  const windows = getBestPostingWindows(insightsRaw);
  const calendar = buildCalendar(now, seed, trendingHashtags);
  const captions = rewriteCaptionLocal({
    caption: posts[0]?.caption || user.bio || '',
    tone: 'viral',
    trendingHashtags,
    nicheId: niche,
  });
  return {
    insights: {
      ...insightsRaw,
      followers,
      niche: detected,
      level: level.level,
      score: level.score,
      nextAction: level.next,
    },
    ideas,
    captions: captions.variants,
    windows,
    calendar,
    cultural,
    trendingHashtags: (trendingHashtags || []).slice(0, 12),
    niches: NICHES.map((n) => ({ id: n.id, label: n.label, emoji: n.emoji })),
    source: 'studio',
    generatedAt: now.toISOString(),
  };
}

export function suggestForDraft({
  caption = '',
  type = 'reel',
  niche,
  mood = 'viral',
  user = {},
  posts = [],
  trendingHashtags = [],
  now = new Date(),
} = {}) {
  const detected = detectNiche(caption, [], user.bio || '');
  const nicheId = niche || detected.id;
  const cultural = culturalMoments(now);
  const seed = `${user._id || 'u'}:${caption.slice(0, 40)}:${now.toISOString().slice(0, 10)}:${type}`;
  const ideas = selectIdeas({
    nicheId,
    seed,
    trendingHashtags,
    cultural,
    limit: 5,
    captionHint: caption,
  });
  const rewritten = rewriteCaptionLocal({ caption, tone: mood, trendingHashtags, nicheId });
  const insights = analyzePosts(posts);
  return {
    niche: { id: nicheId, label: nicheMeta(nicheId).label, emoji: nicheMeta(nicheId).emoji, confidence: detected.confidence },
    type,
    ideas,
    captions: rewritten.variants,
    hashtags: mergeHashtags([], trendingHashtags, nicheId),
    hook: ideas[0]?.hook || rewritten.variants[0]?.hook,
    musicVibe: ideas[0]?.musicVibe || 'trending',
    postingWindow: getBestPostingWindows(insights)[0],
    cultural: cultural[0] || null,
    source: 'studio',
  };
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(String(text).replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return null;
  }
}

async function callGeminiJson(prompt) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || !key.startsWith('AIza')) return null;
  const models = [...new Set([process.env.AI_MARKETING_MODEL?.trim(), 'gemini-2.0-flash', 'gemini-2.0-flash-lite'].filter(Boolean))];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 1400, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = parseJsonSafe(data?.candidates?.[0]?.content?.parts?.[0]?.text);
      if (parsed) return { parsed, model };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function callOpenAIJson(prompt) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.AI_MARKETING_MODEL || 'gpt-4o-mini',
        temperature: 0.85,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Je coach për krijues video në AlbNet. Shkruaj në shqip natyral. Përgjigju vetëm me JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = parseJsonSafe(data?.choices?.[0]?.message?.content);
    if (parsed) return { parsed, model: 'gpt-4o-mini' };
  } catch {
    return null;
  }
  return null;
}

function mergeAiIdeas(base, ai) {
  if (!ai || !Array.isArray(ai.ideas) || !ai.ideas.length) return base;
  const extra = ai.ideas.slice(0, 4).map((raw, i) => {
    const tpl = IDEA_BANK[i % IDEA_BANK.length];
    const card = buildIdeaCard(
      {
        ...tpl,
        title: String(raw.title || tpl.title).slice(0, 80),
        hook: String(raw.hook || tpl.hook).slice(0, 140),
        cta: String(raw.cta || tpl.cta).slice(0, 80),
        beats: Array.isArray(raw.beats) && raw.beats.length ? raw.beats.slice(0, 4).map(String) : tpl.beats,
      },
      {}
    );
    if (raw.caption) card.caption = String(raw.caption).slice(0, 400);
    if (Array.isArray(raw.hashtags)) card.hashtags = unique([...raw.hashtags.map(String), ...card.hashtags]).slice(0, 8);
    card.id = `ai-${hashString(card.title + i).toString(36)}`;
    card.why = raw.why ? String(raw.why).slice(0, 180) : card.why;
    return card;
  });
  const seen = new Set();
  return [...extra, ...base].filter((idea) => {
    if (seen.has(idea.title)) return false;
    seen.add(idea.title);
    return true;
  }).slice(0, 8);
}

export async function enhanceWithAi(payload, { caption = '', type = 'reel' } = {}) {
  const prompt = `Je coach për krijues Reels në AlbNet (rrjet social shqiptar).
Drafti i përdoruesit: "${String(caption || '').slice(0, 280)}"
Lloji: ${type}
Trending hashtag: ${(payload.trendingHashtags || payload.hashtags || []).slice(0, 8).map((t) => (t.tag || t)).join(', ')}
Moment kulturor: ${payload.cultural?.[0]?.title || payload.cultural?.title || 'asnjë'}

Kthe JSON:
{
  "ideas": [
    {
      "title": "titull i shkurtër",
      "hook": "fjalia e parë në ekran, max 90 karaktere",
      "beats": ["0-3s", "mesi", "fundi"],
      "caption": "caption në shqip me emoji",
      "cta": "thirrje për veprim",
      "hashtags": ["tag1","tag2"],
      "why": "pse do të performojë"
    }
  ]
}
Rregulla: shqip natyral, konkret, i guximshëm, jo korporativ. 4 ide.`;

  const ai = (await callGeminiJson(prompt)) || (await callOpenAIJson(prompt));
  if (!ai?.parsed) return { ...payload, source: payload.source || 'studio' };
  const ideas = mergeAiIdeas(payload.ideas || [], ai.parsed);
  return { ...payload, ideas, source: 'ai', aiModel: ai.model };
}

export function getStudioAiStatus() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const gemini = Boolean(geminiKey);
  return {
    aiReady: (gemini && geminiKey.startsWith('AIza')) || openai,
    provider: gemini && geminiKey.startsWith('AIza') ? 'gemini' : openai ? 'openai' : 'studio',
  };
}
