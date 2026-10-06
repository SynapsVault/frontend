import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import "./i18n/config.js";
import "./index.css";

// Defer error tracking initialization until after first paint to keep
// @sentry/react out of the initial bundle.
const scheduleIdle = (callback: () => void) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
};

scheduleIdle(() => {
  import("./lib/sentry.js")
    .then(({ initSentry }) => {
      initSentry();
    })
    .catch((error) => {
      console.error("Failed to initialize error tracking:", error);
    });
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Check index.html for <div id=\"root\"></div>");
}

// Create React root and mount application
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Log app version in development
if (import.meta.env.DEV) {
  console.log(
    "%c🚀 SynapsVault Frontend",
    "font-size: 14px; font-weight: bold; color: #7c5cfc;",
  );
  console.log(`API: ${import.meta.env.VITE_API_URL || "http://localhost:3000"}`);
  console.log(`Network: ${import.meta.env.VITE_NETWORK || "testnet"}`);
}