import React, { Component, type ReactNode, type ErrorInfo } from "react";
import i18n from "i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Extra, context-specific guidance shown below the generic description. */
  hint?: string;
  /**
   * "page" (default) fills the viewport, for the app root. "section" is a
   * compact card, so one broken screen doesn't take down the whole app.
   */
  variant?: "page" | "section";
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors below it and shows a recoverable fallback.
 * Class components can't call useTranslation(), so copy is read from the
 * shared i18next instance at render time.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const t = i18n.t.bind(i18n);

      return (
        <div
          role="alert"
          className={
            this.props.variant === "section"
              ? "flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface px-6 py-12 text-fg"
              : "flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-8 text-fg"
          }
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft ring-1 ring-danger/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t("error_boundary.title")}
          </h2>
          <p className="max-w-md text-center text-sm text-fg-muted">
            {t("error_boundary.description")}
          </p>
          {this.props.hint && (
            <p className="max-w-md text-center text-xs text-fg-subtle">{this.props.hint}</p>
          )}
          <button onClick={this.handleRetry} className="synapse-btn synapse-btn--primary">
            {t("error_boundary.reload")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
