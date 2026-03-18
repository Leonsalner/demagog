"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_FEEDBACK_PAGE_CONTEXT,
  type FeedbackPageContext,
} from "@/lib/feedback";

type FeedbackContextListener = () => void;

interface FeedbackContextStore {
  getSnapshot: () => FeedbackPageContext;
  resetPageContext: (pageContext: FeedbackPageContext) => void;
  setPageContext: (pageContext: FeedbackPageContext) => void;
  subscribe: (listener: FeedbackContextListener) => () => void;
}

const FeedbackContext = createContext<FeedbackContextStore | null>(null);

function isSamePageContext(left: FeedbackPageContext, right: FeedbackPageContext) {
  return (
    left.pageType === right.pageType &&
    left.mode === right.mode &&
    left.query === right.query &&
    left.statement === right.statement
  );
}

function createFeedbackContextStore(): FeedbackContextStore {
  let pageContext = DEFAULT_FEEDBACK_PAGE_CONTEXT;
  const listeners = new Set<FeedbackContextListener>();

  function emitChange() {
    listeners.forEach((listener) => {
      listener();
    });
  }

  return {
    getSnapshot: () => pageContext,
    resetPageContext: (nextPageContext) => {
      if (
        !isSamePageContext(pageContext, nextPageContext) ||
        isSamePageContext(pageContext, DEFAULT_FEEDBACK_PAGE_CONTEXT)
      ) {
        return;
      }

      pageContext = DEFAULT_FEEDBACK_PAGE_CONTEXT;
      emitChange();
    },
    setPageContext: (nextPageContext) => {
      if (isSamePageContext(pageContext, nextPageContext)) {
        return;
      }

      pageContext = nextPageContext;
      emitChange();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function FeedbackContextProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createFeedbackContextStore(), []);

  return <FeedbackContext.Provider value={store}>{children}</FeedbackContext.Provider>;
}

function useFeedbackContextStore() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedbackContext must be used within FeedbackContextProvider");
  }

  return context;
}

export function useFeedbackPageContext() {
  const store = useFeedbackContextStore();

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function usePublishFeedbackPageContext(pageContext: FeedbackPageContext) {
  const store = useFeedbackContextStore();

  useEffect(() => {
    store.setPageContext(pageContext);

    return () => {
      store.resetPageContext(pageContext);
    };
  }, [pageContext, store]);
}
