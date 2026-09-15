import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { DatasetTable } from "@/features/datasets/DatasetTable";
import { UploadDialog } from "@/features/datasets/UploadDialog";
import { useDatasetsQuery, useUploadDatasetMutation } from "@/features/datasets/queries";
import type { DatasetDetail } from "@/types/dataset";

export function DatasetsPage() {
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useDatasetsQuery(page, 20);
  const uploadMutation = useUploadDatasetMutation();
  const navigate = useNavigate();

  const data = list.data;
  const empty = data && data.total === 0;

  useEffect(() => {
    if (searchParams.get("upload") === "1") {
      setUploadOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("upload");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function onUploaded(dataset: DatasetDetail) {
    void navigate(`/datasets/${dataset.id}?analyze=1`);
  }

  const uploadButton = (
    <Button
      onClick={() => {
        setUploadOpen(true);
      }}
    >
      Upload a file
    </Button>
  );

  return (
    <div className="page-enter mx-auto max-w-5xl space-y-6">
      {empty ? (
        <EmptyState
          title="Datasets"
          summary="Upload and work with your data in FACILIO."
          detail="Upload a CSV, Excel (.xlsx), or JSON file. FACILIO can analyze it for problems. Your original file is preserved — cleaning creates a new version."
          visual={
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-secondary">Your data</p>
                {uploadButton}
              </div>
              <p className="mb-4 text-sm text-ink-secondary">
                Or{" "}
                <Link to="/overview?try=1" className="font-medium text-ink underline">
                  Try FACILIO
                </Link>{" "}
                with a fictional customer sample.
              </p>
              <div className="overflow-hidden rounded-[var(--facilio-radius-md)] border border-line">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Empty datasets table</caption>
                  <thead className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                    <tr>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-sm text-ink-muted"
                      >
                        No data yet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                CSV · XLSX · JSON · {String(data.max_upload_size_mb)} MB upload limit
              </p>
            </div>
          }
        />
      ) : (
        <>
          <PageHeader
            title="Datasets"
            description="Upload and work with your data in FACILIO. Analyze to find problems; clean to create a new version without changing the original."
            actions={uploadButton}
          />
          {list.isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading datasets">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}
          {list.isError ? (
            <RecoveryMessage
              experience={mapRecoveryError(list.error, {
                operation: "load",
                action: "Load datasets",
              })}
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void list.refetch();
                  }}
                >
                  Try again
                </Button>
              }
            />
          ) : null}
          {data && data.items.length > 0 ? <DatasetTable items={data.items} /> : null}
          {data && data.total > data.page_size ? (
            <div className="flex items-center justify-between text-sm text-ink-secondary">
              <p>
                Page {String(data.page)} of{" "}
                {String(Math.max(1, Math.ceil(data.total / data.page_size)))}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page * data.page_size >= data.total}
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
        }}
        maxUploadSizeMb={data?.max_upload_size_mb ?? 16}
        onUploaded={onUploaded}
        upload={async (form) => uploadMutation.mutateAsync(form)}
      />
    </div>
  );
}
