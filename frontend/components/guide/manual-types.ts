import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface GuideWorkflow {
  title: string;
  steps: string[];
}

export interface GuideArticle {
  id: string;
  title: string;
  /** Shown next to the title in the nav and article header, for quick scanning. */
  icon?: LucideIcon;
  /** Sidebar route this article documents, if it has a dedicated page. */
  route?: string;
  /** One-liner shown in the article header and in search results. */
  summary: string;
  keyPoints?: string[];
  workflows?: GuideWorkflow[];
  tips?: string[];
  /** Extra terms to match on that don't appear verbatim in the copy above. */
  keywords?: string[];
  /** Escape hatch for articles that need live data (e.g. the permission tables). */
  render?: () => ReactNode;
}

export interface GuideCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
  articles: GuideArticle[];
  /** Rendered above every article in this category, e.g. a live "your access" card. */
  intro?: () => ReactNode;
}

export interface GuideSearchHit {
  category: GuideCategory;
  article: GuideArticle;
  /** The specific "how to" workflow this query matched best, if any — shown as a direct answer. */
  workflow?: GuideWorkflow;
  score: number;
}

/**
 * A person asking "how do I add a lead" doesn't type the literal words that
 * appear in the content ("Create a lead"), so a plain substring search misses
 * it. Question phrasing is stripped, common synonyms/plurals are expanded,
 * and matches are scored so a specific workflow can outrank the whole article.
 */
const QUESTION_PREFIXES =
  /^(how\s+(do|can|could|would)\s+i\s+|how\s+to\s+|how\s+does\s+one\s+|what'?s?\s+the\s+way\s+to\s+|what\s+is\s+the\s+way\s+to\s+|steps?\s+(to|for)\s+|guide\s+(to|on)\s+|where\s+(do|can)\s+i\s+|where\s+is\s+)/i;

const STOPWORDS = new Set([
  'how', 'to', 'do', 'i', 'a', 'an', 'the', 'for', 'of', 'in', 'on', 'my', 'your',
  'is', 'are', 'does', 'it', 'me', 'you', 'with', 'and', 'or', 'can', 'could',
  'would', 'should', 'this', 'that', 'from', 'at', 'be', 'will',
]);

/** word → other words worth matching against, since content uses one canonical term. */
const SYNONYMS: Record<string, string[]> = {
  add: ['create', 'new'],
  adding: ['create', 'creating', 'add'],
  create: ['add', 'new'],
  creating: ['add', 'create'],
  new: ['add', 'create'],
  remove: ['delete'],
  removing: ['delete', 'deleting'],
  delete: ['remove'],
  deleting: ['remove', 'removing'],
  edit: ['update', 'change', 'modify'],
  editing: ['update', 'change'],
  update: ['edit', 'change'],
  updating: ['edit', 'change'],
  change: ['edit', 'update'],
  changing: ['edit', 'update'],
  assign: ['transfer'],
  assigning: ['transfer', 'assign'],
  reassign: ['transfer', 'assign'],
  transfer: ['assign', 'reassign'],
  connect: ['link'],
  connecting: ['link', 'connect'],
  link: ['connect'],
  disconnect: ['unlink', 'logout'],
  send: ['share'],
  sending: ['share', 'send'],
  share: ['send'],
  sharing: ['send', 'share'],
  view: ['see', 'browse', 'find', 'open'],
  find: ['search', 'view'],
  finding: ['search', 'view'],
  search: ['find'],
  searching: ['find', 'search'],
  import: ['upload', 'bulk'],
  importing: ['upload', 'bulk import'],
  upload: ['import'],
  uploading: ['import', 'upload'],
  staff: ['user', 'employee', 'agent'],
  user: ['staff'],
  users: ['staff'],
  employee: ['staff', 'user'],
  agent: ['staff', 'user'],
  booking: ['trip'],
  bookings: ['trip'],
  book: ['won', 'booking'],
  trip: ['booking'],
  trips: ['booking'],
  quote: ['itinerary'],
  quotes: ['itinerary'],
  quotation: ['itinerary'],
  itinerary: ['quote'],
  itineraries: ['quote'],
  pay: ['payment'],
  paying: ['payment'],
  payment: ['pay'],
  payments: ['pay'],
  cancel: ['delete'],
  cancelling: ['delete', 'cancel'],
  canceling: ['delete', 'cancel'],
  setup: ['configure', 'set up'],
  configure: ['setup', 'set up'],
  msg: ['message'],
  chat: ['whatsapp', 'message'],
  reply: ['message', 'send'],
  vehicle: ['car', 'transport'],
  vehicles: ['car', 'transport'],
  destination: ['place'],
  destinations: ['place'],
  permission: ['access', 'feature'],
  permissions: ['access', 'feature'],
  access: ['permission'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Turns a raw query into the set of words/phrases worth matching against. */
export function getSearchTerms(query: string): Set<string> {
  const stripped = query.trim().replace(QUESTION_PREFIXES, '');
  const tokens = tokenize(stripped).filter(t => !STOPWORDS.has(t));
  const source = tokens.length > 0 ? tokens : tokenize(query.trim());

  const terms = new Set<string>();
  for (const token of source) {
    terms.add(token);
    // Cheap singular/plural stemming so "lead" and "leads" both hit.
    if (token.endsWith('s') && token.length > 3) terms.add(token.slice(0, -1));
    else terms.add(`${token}s`);
    for (const synonym of SYNONYMS[token] ?? []) terms.add(synonym);
  }
  return terms;
}

function scoreText(text: string, terms: Set<string>): number {
  const hay = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (hay.includes(term)) score += 1;
  }
  return score;
}

export function searchGuide(categories: GuideCategory[], query: string): GuideSearchHit[] {
  const terms = getSearchTerms(query);
  if (terms.size === 0) return [];

  const hits: GuideSearchHit[] = [];

  for (const category of categories) {
    for (const article of category.articles) {
      let bestWorkflow: GuideWorkflow | undefined;
      let bestWorkflowScore = 0;

      for (const workflow of article.workflows ?? []) {
        const workflowScore =
          scoreText(workflow.title, terms) * 5 + scoreText(workflow.steps.join(' '), terms) * 2;
        if (workflowScore > bestWorkflowScore) {
          bestWorkflowScore = workflowScore;
          bestWorkflow = workflow;
        }
      }

      const articleScore =
        scoreText(article.title, terms) * 4 +
        scoreText(article.summary, terms) * 2 +
        scoreText((article.keyPoints ?? []).join(' '), terms) * 1.5 +
        scoreText((article.tips ?? []).join(' '), terms) * 1.5 +
        scoreText((article.keywords ?? []).join(' '), terms) * 2 +
        scoreText(category.label, terms) * 0.5;

      const score = Math.max(articleScore, bestWorkflowScore);
      if (score <= 0) continue;

      hits.push({
        category,
        article,
        workflow: bestWorkflowScore > 0 && bestWorkflowScore >= articleScore ? bestWorkflow : undefined,
        score,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score);
}
