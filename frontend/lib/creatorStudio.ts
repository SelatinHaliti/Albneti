export type CreatorNiche = {
  id: string;
  label: string;
  emoji: string;
  confidence?: number;
};

export type CreatorIdea = {
  id: string;
  niche: string;
  nicheLabel: string;
  format: string;
  formatLabel: string;
  title: string;
  hook: string;
  script: { t: string; action: string }[];
  caption: string;
  hashtags: string[];
  durationSec: number;
  musicVibe: string;
  cta: string;
  virality: number;
  why: string;
  difficulty: string;
  shots: number;
};

export type CaptionVariant = {
  id: string;
  tone: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
};

export type PostingWindow = {
  label: string;
  hours: string;
  why: string;
  score: number;
  personal?: boolean;
};

export type StudioInsights = {
  total: number;
  videos: number;
  photoShare: number;
  avgLikes: number;
  avgComments: number;
  topHours: { hour: number; eng: number; count: number }[];
  topHashtags: { tag: string; count: number }[];
  daysSince: number | null;
  videoRatio: number;
  followers: number;
  niche: CreatorNiche;
  level: string;
  score: number;
  nextAction: string;
};

export type CalendarDay = {
  date: string;
  weekday: string;
  label: string;
  moment: { title: string; hook: string; niche: string } | null;
  idea: CreatorIdea | null;
};

export type SuggestResponse = {
  success?: boolean;
  niche: CreatorNiche;
  type: string;
  ideas: CreatorIdea[];
  captions: CaptionVariant[];
  hashtags: string[];
  hook: string;
  musicVibe: string;
  postingWindow: PostingWindow;
  cultural: { title: string; hook: string; niche: string } | null;
  source: string;
  ai?: { aiReady: boolean; provider: string };
};

export type StudioResponse = {
  success?: boolean;
  insights: StudioInsights;
  ideas: CreatorIdea[];
  captions: CaptionVariant[];
  windows: PostingWindow[];
  calendar: CalendarDay[];
  cultural: { title: string; hook?: string; niche?: string }[];
  trendingHashtags: { tag: string; count: number }[];
  niches: CreatorNiche[];
  source: string;
  generatedAt: string;
  ai?: { aiReady: boolean; provider: string };
};
