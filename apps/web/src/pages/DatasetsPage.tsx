import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecoveryMessage } from "@/features/recovery/RecoveryMessage";
import { mapRecoveryError } from "@/features/recovery/map-error";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DatasetTable } from "@/features/datasets/DatasetTable";
import { UploadDialog } from "@/features/datasets/UploadDialog";
import { useDatasetsQuery, useUploadDatasetMutation } from "@/features/datasets/queries";
import { useUiStore } from "@/stores/ui-store";
import type { DatasetDetail } from "@/types/dataset";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

export function DatasetsPage() {
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const list = useDatasetsQuery(page, 20);
  const uploadMutation = useUploadDatasetMutation();
  const navigate = useNavigate();
  const openHelp = useUiStore((state) => state.openHelp);

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

  return (
    <div className="page-enter content-page mx-auto space-y-6">
      {empty ? (
        <EmptyState
          title="Datasets"
          summary="Upload a CSV, Excel, or JSON file. FACILIO keeps the original and helps you find problems."
          detail="Cleaning creates a new version. Your uploaded file is not overwritten."
          actions={
            <>
              <Button
                onClick={() => {
                  setUploadOpen(true);
                }}
              >
                Upload your data
              </Button>
              <ButtonLink to="/overview?try=1" variant="secondary">
                Try FACILIO
              </ButtonLink>
            </>
          }
        >
          <p className="type-caption text-ink-muted">
            CSV · Excel · JSON · {String(data.max_upload_size_mb)} MB upload limit
          </p>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Datasets"
            description="Your working data in FACILIO. Open a dataset to inspect, find problems, and clean it without changing the original."
            actions={
              <Button
                onClick={() => {
                  setUploadOpen(true);
                }}
              >
                Upload data
              </Button>
            }
          />
          {list.isLoading ? (
            <div aria-busy="true" aria-label="Loading datasets">
              <TableSkeleton rows={6} />
            </div>
          ) : null}
          {list.isError ? (
            <RecoveryMessage
              experience={{
                ...mapRecoveryError(list.error, {
                  operation: "load",
                  action: "Load datasets",
                }),
                title: "FACILIO couldn't load your datasets.",
                consequence: "Nothing on this page was changed.",
              }}
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void list.refetch();
                    }}
                  >
                    Try again
                  </Button>
                  <Button size="sm" variant="ghost" onClick={openHelp}>
                    Help
                  </Button>
                </div>
              }
            />
          ) : null}
          {data && data.items.length > 0 ? <DatasetTable items={data.items} /> : null}
          {data && data.total > data.page_size ? (
            <div className="flex items-center justify-between text-sm text-ink-secondary">
              <p>
                {String(data.total)} datasets · Page {String(data.page)} of{" "}
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
