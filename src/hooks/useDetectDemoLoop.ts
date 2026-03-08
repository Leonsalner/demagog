"use client";

import { useEffect, useRef, useState } from "react";

import { DETECT_DEMO_QUERIES } from "@/lib/detect-demo-data";
import type { DetectResponse } from "@/types";

export type DetectDemoPhase =
  | "TYPING"
  | "LOADING"
  | "RESULTS"
  | "AWAITING_CLICK"
  | "BUTTON_CLICK"
  | "ADD_FORM"
  | "CLEARING";

export interface DetectDemoState {
  displayedStatement: string;
  response: DetectResponse | null;
  loading: boolean;
  phase: DetectDemoPhase;
  buttonPulsing: boolean;
}

const initialState: DetectDemoState = {
  displayedStatement: "",
  response: null,
  loading: false,
  phase: "TYPING",
  buttonPulsing: false,
};

export function useDetectDemoLoop(): DetectDemoState {
  const [state, setState] = useState<DetectDemoState>(initialState);
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
      const currentQuery = DETECT_DEMO_QUERIES[queryIndexRef.current];
      charIndexRef.current = 0;

      setState({
        displayedStatement: "",
        response: null,
        loading: false,
        phase: "TYPING",
        buttonPulsing: false,
      });

      const typeNextCharacter = () => {
        charIndexRef.current += 1;

        const displayedStatement = currentQuery.statement.slice(0, charIndexRef.current);
        const isComplete = charIndexRef.current >= currentQuery.statement.length;

        setState({
          displayedStatement,
          response: null,
          loading: false,
          phase: "TYPING",
          buttonPulsing: false,
        });

        if (isComplete) {
          schedule(enterLoading, 320);
          return;
        }

        schedule(typeNextCharacter, 60);
      };

      schedule(typeNextCharacter, 60);
    };

    const enterLoading = () => {
      const currentQuery = DETECT_DEMO_QUERIES[queryIndexRef.current];

      setState({
        displayedStatement: currentQuery.statement,
        response: null,
        loading: true,
        phase: "LOADING",
        buttonPulsing: false,
      });

      schedule(enterResults, 2800);
    };

    const enterResults = () => {
      const currentQuery = DETECT_DEMO_QUERIES[queryIndexRef.current];

      setState({
        displayedStatement: currentQuery.statement,
        response: currentQuery.response,
        loading: false,
        phase: "RESULTS",
        buttonPulsing: false,
      });

      if (currentQuery.showAddFlow) {
        schedule(enterAwaitingClick, 1500);
        return;
      }

      schedule(enterClearing, 4000);
    };

    const enterAwaitingClick = () => {
      const currentQuery = DETECT_DEMO_QUERIES[queryIndexRef.current];

      setState({
        displayedStatement: currentQuery.statement,
        response: currentQuery.response,
        loading: false,
        phase: "AWAITING_CLICK",
        buttonPulsing: false,
      });

      schedule(enterButtonClick, 600);
    };

    const enterAddForm = () => {
      const currentQuery = DETECT_DEMO_QUERIES[queryIndexRef.current];

      setState({
        displayedStatement: currentQuery.statement,
        response: currentQuery.response,
        loading: false,
        phase: "ADD_FORM",
        buttonPulsing: false,
      });

      schedule(enterClearing, 3500);
    };

    const enterButtonClick = () => {
      if (!cancelled) {
        setState((currentState) => ({
          ...currentState,
          phase: "BUTTON_CLICK",
          buttonPulsing: true,
        }));
      }

      schedule(enterAddForm, 400);
    };

    const enterClearing = () => {
      const currentQuery = DETECT_DEMO_QUERIES[queryIndexRef.current];
      charIndexRef.current = currentQuery.statement.length;

      const clearNextCharacter = () => {
        charIndexRef.current -= 1;

        const displayedStatement = currentQuery.statement.slice(
          0,
          Math.max(0, charIndexRef.current),
        );
        const isComplete = charIndexRef.current <= 0;

        setState({
          displayedStatement,
          response: null,
          loading: false,
          phase: "CLEARING",
          buttonPulsing: false,
        });

        if (isComplete) {
          queryIndexRef.current = (queryIndexRef.current + 1) % DETECT_DEMO_QUERIES.length;
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
