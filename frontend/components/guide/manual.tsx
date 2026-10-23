'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ListChecks,
  Search,
  X,
} from 'lucide-react';
import type { GuideArticle, GuideCategory, GuideSearchHit } from './manual-types';
import { getSearchTerms, searchGuide } from './manual-types';

/**
 * The Guide's shell: a search bar, a segregated (categorized) list of every
 * help topic in the CRM, and a reader pane. Content lives in manual-content.tsx
 * so this file only knows how to navigate and render it.
 */
export function Manual({ categories }: { categories: GuideCategory[] }) {
  const [query, setQuery] = useState('');
  const [openCategoryId, setOpenCategoryId] = useState(categories[0]?.id ?? '');
  const [activeArticleId, setActiveArticleId] = useState(categories[0]?.articles[0]?.id ?? '');

  const activeCategory =
    categories.find(c => c.articles.some(a => a.id === activeArticleId)) ?? categories[0];
  const activeArticle =
    activeCategory?.articles.find(a => a.id === activeArticleId) ?? activeCategory?.articles[0];

  const hits = useMemo(() => searchGuide(categories, query), [categories, query]);
  const isSearching = query.trim().length > 0;

  const totalArticles = useMemo(
    () => categories.reduce((sum, c) => sum + c.articles.length, 0),
    [categories]
  );

  const select = (categoryId: string, articleId: string) => {
    setOpenCategoryId(categoryId);
    setActiveArticleId(articleId);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Ask how to do something — &ldquo;how to add a lead&rdquo;, &ldquo;send a PDF&rdquo;, &ldquo;connect WhatsApp&rdquo;"
            className="h-11 pl-9 pr-9 text-sm shadow-brand"
            aria-label="Search the guide"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {!isSearching && (
          <p className="mt-1.5 pl-1 text-[11px] text-muted-foreground">
            {totalArticles} topics across {categories.length} categories
          </p>
        )}
      </div>

      {isSearching ? (
        <SearchResults hits={hits} query={query} onSelect={select} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
          <Card className="hover:translate-y-0 hover:border-border lg:sticky lg:top-20">
            <CardContent className="space-y-1 p-2">
              {categories.map(category => (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  isOpen={category.id === openCategoryId}
                  activeArticleId={activeArticle?.id}
                  onToggle={() =>
                    setOpenCategoryId(prev => (prev === category.id ? '' : category.id))
                  }
                  onSelect={articleId => select(category.id, articleId)}
                />
              ))}
            </CardContent>
          </Card>

          <div className="min-w-0">
            {activeCategory && activeArticle && (
              <ArticleView
                key={activeArticle.id}
                category={activeCategory}
                article={activeArticle}
                onNavigate={articleId => select(activeCategory.id, articleId)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  category,
  isOpen,
  activeArticleId,
  onToggle,
  onSelect,
}: {
  category: GuideCategory;
  isOpen: boolean;
  activeArticleId?: string;
  onToggle: () => void;
  onSelect: (articleId: string) => void;
}) {
  const Icon = category.icon;
  const containsActive = category.articles.some(a => a.id === activeArticleId);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
          isOpen || containsActive
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-muted/60'
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{category.label}</span>
        </span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {category.articles.length}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="mb-1 mt-0.5 space-y-2">
          <p className="px-4 text-[11px] leading-4 text-muted-foreground">{category.blurb}</p>
          <ul className="ml-[1.55rem] space-y-0.5 border-l border-border pl-2.5">
            {category.articles.map(article => {
              const ArticleIcon = article.icon;
              const isActive = article.id === activeArticleId;
              return (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(article.id)}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors sm:text-[13px]',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    {ArticleIcon && <ArticleIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                    <span className="truncate">{article.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Wraps every occurrence of any term in `terms` inside `text` with a <mark>. */
function highlight(text: string, terms: Set<string>) {
  if (terms.size === 0) return text;
  const escaped = [...terms]
    .filter(t => t.length > 1)
    .sort((a, b) => b.length - a.length)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return text;

  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'ig'));
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    terms.has(part.toLowerCase()) ? (
      <mark key={i} className="rounded-sm bg-primary/20 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const MAX_RESULTS = 20;

function SearchResults({
  hits,
  query,
  onSelect,
}: {
  hits: GuideSearchHit[];
  query: string;
  onSelect: (categoryId: string, articleId: string) => void;
}) {
  const terms = useMemo(() => getSearchTerms(query), [query]);

  if (hits.length === 0) {
    return (
      <Card className="hover:translate-y-0 hover:border-border">
        <CardContent className="p-8 text-center">
          <p className="text-sm font-medium text-foreground">No help topics match that</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try asking it differently, or a shorter word like &ldquo;lead&rdquo; or
            &ldquo;itinerary&rdquo;.
          </p>
        </CardContent>
      </Card>
    );
  }

  const shown = hits.slice(0, MAX_RESULTS);

  return (
    <div className="space-y-3 animate-in fade-in-0 duration-200">
      <p className="text-xs text-muted-foreground">
        {hits.length} {hits.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
        {hits.length > MAX_RESULTS && ` — showing the top ${MAX_RESULTS}`}
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map(hit =>
          hit.workflow ? (
            <HowToCard
              key={`${hit.article.id}:${hit.workflow.title}`}
              hit={hit}
              workflow={hit.workflow}
              terms={terms}
              onSelect={onSelect}
            />
          ) : (
            <TopicCard key={hit.article.id} hit={hit} terms={terms} onSelect={onSelect} />
          )
        )}
      </div>
    </div>
  );
}

function HowToCard({
  hit,
  workflow,
  terms,
  onSelect,
}: {
  hit: GuideSearchHit;
  workflow: NonNullable<GuideSearchHit['workflow']>;
  terms: Set<string>;
  onSelect: (categoryId: string, articleId: string) => void;
}) {
  const { category, article } = hit;
  return (
    <Card className="h-full border-primary/20 bg-primary/[0.03] hover:border-primary/40">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
            How to
          </span>
          <span className="text-[11px] text-muted-foreground">
            {category.label} <ChevronRight className="inline h-2.5 w-2.5" /> {article.title}
          </span>
        </div>

        <h4 className="mt-2 text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">
          {highlight(workflow.title, terms)}
        </h4>

        <ol className="mt-3 space-y-2">
          {workflow.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-xs leading-5 text-muted-foreground sm:text-[13px]">
                {highlight(step, terms)}
              </p>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => onSelect(category.id, article.id)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:opacity-80"
        >
          Open full topic: {article.title}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

function TopicCard({
  hit,
  terms,
  onSelect,
}: {
  hit: GuideSearchHit;
  terms: Set<string>;
  onSelect: (categoryId: string, articleId: string) => void;
}) {
  const { category, article } = hit;
  const Icon = article.icon ?? category.icon;
  return (
    <button type="button" onClick={() => onSelect(category.id, article.id)} className="text-left">
      <Card className="h-full hover:border-primary/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {category.label}
              </p>
              <h4 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
                {highlight(article.title, terms)}
              </h4>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {highlight(article.summary, terms)}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}

function ArticleView({
  category,
  article,
  onNavigate,
}: {
  category: GuideCategory;
  article: GuideArticle;
  onNavigate: (articleId: string) => void;
}) {
  const Icon = article.icon;
  const index = category.articles.findIndex(a => a.id === article.id) + 1;

  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>{category.label}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground/80">
          Topic {index} of {category.articles.length}
        </span>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {article.title}
          </h2>
          {article.route && (
            <Link
              href={article.route}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Open {article.route}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{article.summary}</p>
      </div>

      {category.intro?.()}

      {article.render ? (
        article.render()
      ) : (
        <div className="space-y-4">
          {article.keyPoints && article.keyPoints.length > 0 && (
            <Card className="hover:translate-y-0 hover:border-border">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Key fields &amp; concepts
                </h3>
                <ul className="mt-2.5 space-y-1.5">
                  {article.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-5 sm:text-sm">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                      <span className="text-foreground/90">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {article.workflows && article.workflows.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {article.workflows.map(workflow => (
                <Card key={workflow.title} className="hover:translate-y-0 hover:border-border">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        {workflow.title}
                      </h3>
                    </div>
                    <ol className="mt-3 space-y-2">
                      {workflow.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <p className="text-xs leading-5 text-muted-foreground sm:text-[13px]">
                            {step}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {article.tips && article.tips.length > 0 && (
            <Card className="border-warning/30 bg-warning/5 hover:translate-y-0 hover:border-warning/30">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-warning" />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Tips &amp; gotchas
                  </h3>
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {article.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-5 sm:text-[13px]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {category.articles.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <PrevNextButton
            category={category}
            currentId={article.id}
            direction="prev"
            onNavigate={onNavigate}
          />
          <PrevNextButton
            category={category}
            currentId={article.id}
            direction="next"
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}

function PrevNextButton({
  category,
  currentId,
  direction,
  onNavigate,
}: {
  category: GuideCategory;
  currentId: string;
  direction: 'prev' | 'next';
  onNavigate: (articleId: string) => void;
}) {
  const index = category.articles.findIndex(a => a.id === currentId);
  const target = direction === 'prev' ? category.articles[index - 1] : category.articles[index + 1];
  if (!target) return <span />;

  return (
    <button
      type="button"
      onClick={() => onNavigate(target.id)}
      className={cn(
        'inline-flex max-w-[48%] items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary',
        direction === 'next' && 'ml-auto flex-row-reverse text-right'
      )}
    >
      {direction === 'prev' ? (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rotate-180" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{target.title}</span>
    </button>
  );
}
