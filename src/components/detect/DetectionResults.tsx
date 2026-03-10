import { DetectResponse, DetectionMatch } from "@/types";

import StatementCard from "../shared/StatementCard";

interface DetectionResultsProps {
  result: DetectResponse;
}

const statusConfig = {
  DUPLICATE_FOUND: {
    container: "border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/40",
    icon: "⚠",
    title: "Nájdený duplicitný výrok",
    description: "Tento nárok bol pravdepodobne už overený.",
    detail: "Nižšie nájdete existujúce overenia s hodnotením.",
  },
  RELATED_ONLY: {
    container: "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40",
    icon: "◔",
    title: "Nájdené súvisiace výroky",
    description: "Odporúčame kontrolu existujúcich overení.",
    detail: "Nižšie nájdete výroky na podobnú tému.",
  },
  NEW_CLAIM: {
    container: "border-green-200 bg-green-50 dark:border-green-800/60 dark:bg-green-950/40",
    icon: "✓",
    title: "Nový výrok",
    description: "V databáze sa nenašiel podobný overený nárok.",
    detail: "Tento výrok vyžaduje úplné overenie.",
  },
} as const;

function sortMatches(matches: DetectionMatch[]) {
  const order = {
    DUPLICATE: 0,
    RELATED: 1,
    UNRELATED: 2,
  } as const;

  return [...matches].sort((left, right) => order[left.classification] - order[right.classification]);
}

export default function DetectionResults({ result }: DetectionResultsProps) {
  const visibleMatches = sortMatches(
    result.matches.filter((match) => match.classification !== "UNRELATED"),
  );
  const hiddenMatches = sortMatches(
    result.matches.filter((match) => match.classification === "UNRELATED"),
  );
  const status = statusConfig[result.overall_status];

  return (
    <section className="space-y-5">
      <div className={`rounded-2xl border p-5 ${status.container}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-base font-semibold text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            {status.icon}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {status.title} - {status.description}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{status.detail}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">Analýza trvala {result.query_time_ms} ms</p>

      {visibleMatches.length > 0 ? (
        <div className="space-y-4">
          {visibleMatches.map((match) => (
            <StatementCard
              key={`${match.classification}-${match.statement.id}`}
              statement={{ ...match.statement, similarity: match.similarity }}
              classification={match.classification}
              explanation={match.explanation}
              show_similarity
            />
          ))}
        </div>
      ) : null}

      {hiddenMatches.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ďalšie výsledky ({hiddenMatches.length})
          </summary>
          <div className="mt-4 space-y-4">
            {hiddenMatches.map((match) => (
              <StatementCard
                key={`${match.classification}-${match.statement.id}`}
                statement={{ ...match.statement, similarity: match.similarity }}
                classification={match.classification}
                explanation={match.explanation}
                show_similarity
              />
            ))}
          </div>
        </details>
      ) : null}

      {result.related_articles && result.related_articles.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Súvisiaci kontext
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Najbližšie články z databázy, ktoré môžu pomôcť pri rýchlom posúdení výroku.
            </p>
          </div>

          <div className="space-y-3">
            {result.related_articles.map((article) => (
              <article
                key={article.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70"
              >
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {article.autor}
                  {article.datum ? ` · ${new Date(article.datum).toLocaleDateString("sk-SK")}` : ""}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {article.text}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
