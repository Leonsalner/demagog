"use client";

import { useCallback, useRef, useState } from "react";

import {
  createAggregateResearchRequest,
  createStatementResearchRequest,
  fetchResearch,
  type OpenResearchOptions,
  type ResearchRequest,
} from "@/lib/research-client";
import type { ResearchWorkspaceMode, ResearchWorkspaceResponse } from "@/types";
import type { OpenResearchHistorySnapshot, ResearchPaneSelection } from "@/types/history";

export type WorkspaceDisplayState = "closed" | "entering" | "open" | "closing";

export function useResearch() {
  const [data, setData] = useState<ResearchWorkspaceResponse | null>(null);
  const [displayState, setDisplayState] = useState<WorkspaceDisplayState>("closed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ResearchWorkspaceMode | null>(null);
  const [activeTab, setActiveTab] = useState<"articles" | "statements">("articles");
  const [selection, setSelection] = useState<ResearchPaneSelection>(null);
  const [lastRequest, setLastRequest] = useState<ResearchRequest | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isOpen = displayState !== "closed";
  const isEntering = displayState === "entering";
  const isClosing = displayState === "closing";

  const open = useCallback(async (request: ResearchRequest, options?: OpenResearchOptions) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const revealWhenReady = options?.revealWhenReady ?? true;

    setLastRequest(request);
    setActiveMode(request.mode);
    setActiveTab("articles");
    setSelection(null);
    setDisplayState(revealWhenReady ? "entering" : "closed");
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const nextData = await fetchResearch(request, controller.signal);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setData(nextData);
      if (!revealWhenReady) {
        setDisplayState("entering");
      }
    } catch (nextError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Nepodarilo sa načítať prieskum.");
      if (!revealWhenReady) {
        setDisplayState("entering");
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const openStatementResearch = useCallback(
    async (statementId: number, options?: OpenResearchOptions) => {
      await open(createStatementResearchRequest(statementId), options);
    },
    [open],
  );

  const openAggregateResearch = useCallback(
    async (statementIds: number[], options?: OpenResearchOptions) => {
      await open(createAggregateResearchRequest(statementIds), options);
    },
    [open],
  );

  const openPreparedResearch = useCallback(
    (request: ResearchRequest, preparedData: ResearchWorkspaceResponse) => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setLastRequest(request);
      setActiveMode(preparedData.mode);
      setData(preparedData);
      setError(null);
      setLoading(false);
      setDisplayState("entering");
    },
    [],
  );

  const restoreSnapshot = useCallback((snapshot: OpenResearchHistorySnapshot) => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLastRequest(snapshot.request);
    setActiveMode(snapshot.data.mode);
    setActiveTab(snapshot.activeTab);
    setSelection(snapshot.selection);
    setData(snapshot.data);
    setError(null);
    setLoading(false);
    setDisplayState("entering");
  }, []);

  const retry = useCallback(async () => {
    if (!lastRequest) {
      return;
    }

    await open(lastRequest);
  }, [lastRequest, open]);

  const finishEnter = useCallback(() => {
    setDisplayState((currentState) => (currentState === "entering" ? "open" : currentState));
  }, []);

  const startClose = useCallback(() => {
    setDisplayState("closing");
  }, []);

  const finishClose = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setDisplayState("closed");
    setError(null);
    setLoading(false);
    setActiveMode(null);
    setActiveTab("articles");
    setSelection(null);
  }, []);

  const dismiss = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setDisplayState("closed");
    setError(null);
    setLoading(false);
    setActiveMode(null);
    setActiveTab("articles");
    setSelection(null);
  }, []);

  return {
    activeMode,
    activeTab,
    selection,
    data,
    displayState,
    isOpen,
    isEntering,
    isClosing,
    isPendingReveal: loading && !isOpen,
    loading,
    error,
    lastRequest,
    openStatementResearch,
    openAggregateResearch,
    openPreparedResearch,
    restoreSnapshot,
    retry,
    finishEnter,
    startClose,
    finishClose,
    dismiss,
    setActiveTab,
    setSelection,
  };
}
