"use client";

import { useEffect, useRef, useState } from "react";

import { DEMO_ARTICLES, DEMO_QUERIES, type DemoArticle } from "@/lib/demo-data";
import type { Statement, Verdict } from "@/types";

type DemoPhase = "TYPING" | "LOADING" | "RESULTS" | "CLEARING";

type DemoFilters = {
  meno: string | null;
  vyhodnotenie: Verdict | null;
  strana: string | null;
};

export interface DemoState {
  displayedQuery: string;
  results: Statement[] | null;
  filters: DemoFilters | null;
  articles: DemoArticle[] | null;
  loading: boolean;
  phase: DemoPhase;
}

const initialState: DemoState = {
  displayedQuery: "",
  results: null,
  filters: null,
  articles: null,
  loading: false,
  phase: "TYPING",
};

export function useDemoLoop(): DemoState {
  const [state, setState] = useState<DemoState>(initialState);
  const timeoutRef = useRef<number | null>(null);
  const queryIndexRef = useRef(0);
  const charIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const clearScheduledStep = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const schedule = (callback: () => void, delay: number) => {
      clearScheduledStep();
      timeoutRef.current = window.setTimeout(() => {
        if (!cancelled) {
          callback();
        }
      }, delay);
    };

    const enterTyping = () => {
      const currentQuery = DEMO_QUERIES[queryIndexRef.current];
      charIndexRef.current = 0;

      setState({
        displayedQuery: "",
        results: null,
        filters: null,
        articles: null,
        loading: false,
        phase: "TYPING",
      });

      const typeNextCharacter = () => {
        charIndexRef.current += 1;

        const displayedQuery = currentQuery.query.slice(0, charIndexRef.current);
        const isComplete = charIndexRef.current >= currentQuery.query.length;

        setState({
          displayedQuery,
          results: null,
          filters: null,
          articles: null,
          loading: false,
          phase: "TYPING",
        });

        if (isComplete) {
          enterLoading();
          return;
        }

        schedule(typeNextCharacter, 60);
      };

      schedule(typeNextCharacter, 60);
    };

    const enterLoading = () => {
      const currentQuery = DEMO_QUERIES[queryIndexRef.current];

      setState({
        displayedQuery: currentQuery.query,
        results: null,
        filters: currentQuery.filters,
        articles: null,
        loading: true,
        phase: "LOADING",
      });

      schedule(enterResults, 800);
    };

    const enterResults = () => {
      const currentQuery = DEMO_QUERIES[queryIndexRef.current];
      const articles = DEMO_ARTICLES.filter((article) =>
        currentQuery.articleIds.includes(article.id),
      );

      setState({
        displayedQuery: currentQuery.query,
        results: currentQuery.results,
        filters: currentQuery.filters,
        articles,
        loading: false,
        phase: "RESULTS",
      });

      schedule(enterClearing, 3500);
    };

    const enterClearing = () => {
      const currentQuery = DEMO_QUERIES[queryIndexRef.current];
      charIndexRef.current = currentQuery.query.length;

      const clearNextCharacter = () => {
        charIndexRef.current -= 1;

        const displayedQuery = currentQuery.query.slice(0, Math.max(0, charIndexRef.current));
        const isComplete = charIndexRef.current <= 0;

        setState({
          displayedQuery,
          results: null,
          filters: null,
          articles: null,
          loading: false,
          phase: "CLEARING",
        });

        if (isComplete) {
          queryIndexRef.current = (queryIndexRef.current + 1) % DEMO_QUERIES.length;
          enterTyping();
          return;
        }

        schedule(clearNextCharacter, 30);
      };

      schedule(clearNextCharacter, 30);
    };

    enterTyping();

    return () => {
      cancelled = true;
      clearScheduledStep();
    };
  }, []);

  return state;
}
