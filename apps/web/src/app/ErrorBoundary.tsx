import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("FACILIO UI error", error.message, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-xl px-6 py-16">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Something prevented this page from loading.
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-secondary">
            FACILIO did not confirm a result. You can try this page again or return Home.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                this.setState({ hasError: false, message: "" });
              }}
            >
              Try again
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.assign("/overview");
              }}
            >
              Go Home
            </Button>
          </div>
          {this.state.message ? (
            <div className="mt-6">
              <TechnicalDetails>
                <p>{this.state.message}</p>
              </TechnicalDetails>
            </div>
          ) : null}
        </main>
      );
    }
    return this.props.children;
  }
}
