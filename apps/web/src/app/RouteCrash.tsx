import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

import { Button } from "@/components/ui/Button";
import { TechnicalDetails } from "@/components/ui/TechnicalDetails";

export function RouteCrash() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = messageFromRouteError(error);

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="type-page-title text-ink">This page couldn’t be shown</h1>
      <p className="type-body mt-3 text-ink-secondary">
        Something prevented this page from loading. Your data was not changed from this
        screen. You can try again or go Home.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Try again
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigate("/overview");
          }}
        >
          Go Home
        </Button>
      </div>
      {message ? (
        <div className="mt-6">
          <TechnicalDetails>
            <p>{message}</p>
          </TechnicalDetails>
        </div>
      ) : null}
    </main>
  );
}

function messageFromRouteError(error: unknown): string | null {
  if (isRouteErrorResponse(error)) {
    return `${String(error.status)} ${error.statusText}`.trim();
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return null;
}
