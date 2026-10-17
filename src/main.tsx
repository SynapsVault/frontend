import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { API_BASE, STELLAR_NETWORK } from "./lib/config.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { captureException } from "./lib/sentry.js";
import "./i18n/config.js";
import "./index.css";

async function bootstrap() {
  // Start Sentry before the first render so startup errors are captured while
  // retaining the dynamic import and its separate vendor chunk.
  try {
    const { initSentry } = await import("./lib/sentry.js");
    await initSentry();
  } catch (error) {
    console.error("Failed to initialize error tracking:", error);
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found. Check index.html for <div id=\"root\"></div>");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

// Create React root and mount application
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary onError={captureException}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
void bootstrap();

// Log app version in development
if (import.meta.env.DEV) {
  console.log(
    "%c🚀 SynapsVault Frontend",
    "font-size: 14px; font-weight: bold; color: #7c5cfc;",
  );
  console.log(`API: ${API_BASE || "(same origin → dev proxy → http://localhost:3000)"}`);
  console.log(`Network: ${STELLAR_NETWORK}`);
}
