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

interface FeedbackWidgetSnapshot {
  isOpen: boolean;
  isToggleLocked: boolean;
  pendingCloseReset: boolean;
  isSubmitting: boolean;
}

interface FeedbackWidgetStore {
  getSnapshot: () => FeedbackWidgetSnapshot;
  openPanel: () => void;
  closePanel: () => void;
  requestCloseWithReset: (resetAfterClose: boolean) => void;
  togglePanel: () => void;
  setToggleLocked: (locked: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  clearPendingCloseReset: () => void;
  subscribe: (listener: FeedbackContextListener) => () => void;
}

const FeedbackContext = createContext<FeedbackContextStore | null>(null);
const FeedbackWidgetContext = createContext<FeedbackWidgetStore | null>(null);

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

function createFeedbackWidgetStore(): FeedbackWidgetStore {
  let isOpen = false;
  let isToggleLocked = false;
  let pendingCloseReset = false;
  let isSubmitting = false;
  let currentSnapshot: FeedbackWidgetSnapshot = { isOpen, isToggleLocked, pendingCloseReset, isSubmitting };
  const listeners = new Set<FeedbackContextListener>();

  function emitChange() {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function updateSnapshot() {
    const newSnapshot = { isOpen, isToggleLocked, pendingCloseReset, isSubmitting };
    if (
      newSnapshot.isOpen === currentSnapshot.isOpen &&
      newSnapshot.isToggleLocked === currentSnapshot.isToggleLocked &&
      newSnapshot.pendingCloseReset === currentSnapshot.pendingCloseReset &&
      newSnapshot.isSubmitting === currentSnapshot.isSubmitting
    ) {
      return;
    }
    currentSnapshot = newSnapshot;
  }

  return {
    getSnapshot: () => currentSnapshot,
    openPanel: () => {
      if (isToggleLocked) {
        return;
      }
      if (isOpen) {
        return;
      }
      isOpen = true;
      updateSnapshot();
      emitChange();
    },
    closePanel: () => {
      if (isToggleLocked) {
        return;
      }
      if (!isOpen) {
        return;
      }
      isOpen = false;
      updateSnapshot();
      emitChange();
    },
    requestCloseWithReset: (resetAfterClose: boolean) => {
      if (isToggleLocked) {
        return;
      }
      if (!isOpen) {
        return;
      }
      isOpen = false;
      pendingCloseReset = resetAfterClose;
      updateSnapshot();
      emitChange();
    },
    clearPendingCloseReset: () => {
      if (!pendingCloseReset) {
        return;
      }
      pendingCloseReset = false;
      updateSnapshot();
      emitChange();
    },
    togglePanel: () => {
      if (isToggleLocked) {
        return;
      }
      isOpen = !isOpen;
      updateSnapshot();
      emitChange();
    },
    setToggleLocked: (locked: boolean) => {
      if (isToggleLocked === locked) {
        return;
      }
      isToggleLocked = locked;
      updateSnapshot();
      emitChange();
    },
    setIsSubmitting: (submitting: boolean) => {
      if (isSubmitting === submitting) {
        return;
      }
      isSubmitting = submitting;
      updateSnapshot();
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
  const pageContextStore = useMemo(() => createFeedbackContextStore(), []);
  const widgetStore = useMemo(() => createFeedbackWidgetStore(), []);

  return (
    <FeedbackContext.Provider value={pageContextStore}>
      <FeedbackWidgetContext.Provider value={widgetStore}>
        {children}
      </FeedbackWidgetContext.Provider>
    </FeedbackContext.Provider>
  );
}

function useFeedbackContextStore() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedbackContext must be used within FeedbackContextProvider");
  }

  return context;
}

export function useFeedbackWidgetStore() {
  const context = useContext(FeedbackWidgetContext);

  if (!context) {
    throw new Error("useFeedbackWidgetControls must be used within FeedbackContextProvider");
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

export function useFeedbackWidgetControls() {
  const store = useFeedbackWidgetStore();

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return {
    ...snapshot,
    openPanel: store.openPanel,
    closePanel: store.closePanel,
    togglePanel: store.togglePanel,
    setToggleLocked: store.setToggleLocked,
    setIsSubmitting: store.setIsSubmitting,
  };
}
