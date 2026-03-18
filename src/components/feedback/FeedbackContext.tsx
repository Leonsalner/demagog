"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  DEFAULT_FEEDBACK_PAGE_CONTEXT,
  type FeedbackPageContext,
} from "@/lib/feedback";

interface FeedbackContextValue {
  pageContext: FeedbackPageContext;
  setPageContext: Dispatch<SetStateAction<FeedbackPageContext>>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function isSamePageContext(left: FeedbackPageContext, right: FeedbackPageContext) {
  return (
    left.pageType === right.pageType &&
    left.mode === right.mode &&
    left.query === right.query &&
    left.statement === right.statement
  );
}

export function FeedbackContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<FeedbackPageContext>(
    DEFAULT_FEEDBACK_PAGE_CONTEXT,
  );
  const value = useMemo(
    () => ({
      pageContext,
      setPageContext,
    }),
    [pageContext],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedbackContext() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedbackContext must be used within FeedbackContextProvider");
  }

  return context;
}

export function usePublishFeedbackPageContext(pageContext: FeedbackPageContext) {
  const { setPageContext } = useFeedbackContext();

  useEffect(() => {
    setPageContext((currentPageContext) =>
      isSamePageContext(currentPageContext, pageContext) ? currentPageContext : pageContext,
    );

    return () => {
      setPageContext((currentPageContext) =>
        isSamePageContext(currentPageContext, pageContext)
          ? DEFAULT_FEEDBACK_PAGE_CONTEXT
          : currentPageContext,
      );
    };
  }, [pageContext, setPageContext]);
}
