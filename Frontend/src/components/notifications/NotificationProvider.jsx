import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import "../../components/css/globalNotice.css";

const NotificationContext = createContext(null);

const DEFAULT_DURATION = 4000;

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({ type: "", message: "", visible: false });
  const timeoutRef = useRef(null);

  const clearNotification = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setNotification({ type: "", message: "", visible: false });
  };

  const showNotification = (type, message, duration = DEFAULT_DURATION) => {
    if (!message) return;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setNotification({ type, message, visible: true });

    timeoutRef.current = window.setTimeout(() => {
      setNotification({ type: "", message: "", visible: false });
      timeoutRef.current = null;
    }, duration);
  };

  const value = useMemo(
    () => ({
      showNotification,
      showSuccess: (message, duration) => showNotification("success", message, duration),
      showError: (message, duration) => showNotification("error", message, duration),
      showInfo: (message, duration) => showNotification("info", message, duration),
      clearNotification
    }),
    []
  );

  return (
    <NotificationContext.Provider value={value}>
      {notification.visible ? (
        <div className={`global-notice ${notification.type || "info"}`} role="status" aria-live="polite">
          <span>{notification.message}</span>
          <button type="button" onClick={clearNotification} aria-label="Dismiss notification">
            x
          </button>
        </div>
      ) : null}
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }

  return context;
}
