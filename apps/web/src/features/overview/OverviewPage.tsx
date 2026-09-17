import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { UploadDialog } from "@/features/datasets/UploadDialog";
import {
  useDatasetsQuery,
  useImportCustomerSampleMutation,
  useUploadDatasetMutation,
  useWorkspaceStatsQuery,
} from "@/features/datasets/queries";
import { useJobsQuery, useOperationsHealthQuery } from "@/features/jobs/queries";
import {
  DegradedHome,
  HomeLoadingState,
  LimitedServiceNotice,
} from "@/features/overview/DegradedHome";
import { FirstRunHome } from "@/features/overview/FirstRunHome";
import { ReturningHome } from "@/features/overview/ReturningHome";
import { SampleHome } from "@/features/overview/SampleHome";
import {
  classifyHome,
  isSampleDataset,
  sampleDestination,
} from "@/features/overview/home-state";
import { compactHealthFromChecks } from "@/features/system-health/compact-health";
import { useHealthQuery, useReadinessQuery } from "@/hooks/use-system-status";
import type { DatasetDetail } from "@/types/dataset";

export function OverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const importLock = useRef(false);
  const navigate = useNavigate();
  const datasetsQuery = useDatasetsQuery(1, 20);
  const statsQuery = useWorkspaceStatsQuery();
  const health = useHealthQuery();
  const readiness = useReadinessQuery();
  const operations = useOperationsHealthQuery();
  const apiDown = health.isError;
  const homeKind = classifyHome({
    datasetsPending: datasetsQuery.isPending || statsQuery.isPending,
    datasetsFailed: datasetsQuery.isError,
    apiDown,
    items: statsQuery.data?.recent_datasets ?? datasetsQuery.data?.items,
    userDatasetCount: statsQuery.data?.user_dataset_count,
    sampleDatasetCount: statsQuery.data?.sample_dataset_count,
  });
  const hasUserData = homeKind === "returning";
  const jobsQuery = useJobsQuery({ page: 1, page_size: 5 }, hasUserData);
  const uploadMutation = useUploadDatasetMutation();
  const sampleMutation = useImportCustomerSampleMutation();
  const healthPresentation = compactHealthFromChecks({
    healthError: health.isError,
    healthSuccess: health.isSuccess,
    databaseStatus: readiness.data?.checks.database?.status,
    queueStatus: operations.data?.queue.status,
    workerStatus: operations.data?.worker.status,
  });

  const items = statsQuery.data?.recent_datasets ?? datasetsQuery.data?.items ?? [];
  const sampleDataset = items.find(isSampleDataset);
  const userDatasets = items.filter((item) => !isSampleDataset(item));
  const recentDatasets = (hasUserData ? userDatasets : items).slice(0, 5);

  useEffect(() => {
    if (searchParams.get("upload") === "1" && !apiDown) {
      setUploadOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("upload");
      setSearchParams(next, { replace: true });
    }
  }, [apiDown, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("try") !== "1") {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("try");
    setSearchParams(next, { replace: true });
    if (apiDown || importLock.current) {
      return;
    }
    void runSampleImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume try=1 once
  }, [searchParams, apiDown, setSearchParams]);

  async function runSampleImport() {
    if (importLock.current) {
      return;
    }
    importLock.current = true;
    try {
      const dataset = await sampleMutation.mutateAsync();
      void navigate(sampleDestination(dataset));
    } catch {
      importLock.current = false;
    }
  }

  function onUploaded(dataset: DatasetDetail) {
    void navigate(`/datasets/${dataset.id}?analyze=1`);
  }

  function retryHealth() {
    void health.refetch();
    void readiness.refetch();
    void operations.refetch();
    void datasetsQuery.refetch();
    void statsQuery.refetch();
  }

  return (
    <div
      className="page-enter content-page mx-auto space-y-8"
      data-testid="home-kind"
      data-kind={homeKind}
    >
      {homeKind === "loading" ? <HomeLoadingState /> : null}

      {homeKind === "degraded" ? (
        <DegradedHome
          message={
            datasetsQuery.error instanceof Error
              ? datasetsQuery.error.message
              : apiDown
                ? "FACILIO cannot reach the data service right now."
                : "Datasets could not be loaded."
          }
          onRetry={retryHealth}
        />
      ) : null}

      {homeKind === "empty" ? (
        <FirstRunHome
          onUpload={() => {
            setUploadOpen(true);
          }}
          onTryFacilio={() => {
            void runSampleImport();
          }}
          sampleBusy={sampleMutation.isPending}
          sampleError={sampleMutation.error}
          limitedNotice={
            <LimitedServiceNotice
              presentation={healthPresentation}
              onRetry={retryHealth}
            />
          }
        />
      ) : null}

      {homeKind === "sample-only" ? (
        <SampleHome
          sample={sampleDataset}
          onUpload={() => {
            setUploadOpen(true);
          }}
          sampleError={sampleMutation.error}
          limitedNotice={
            <LimitedServiceNotice
              presentation={healthPresentation}
              onRetry={retryHealth}
            />
          }
        />
      ) : null}

      {homeKind === "returning" ? (
        <ReturningHome
          datasets={recentDatasets}
          jobs={jobsQuery}
          onUpload={() => {
            setUploadOpen(true);
          }}
        />
      ) : null}

      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
        }}
        maxUploadSizeMb={datasetsQuery.data?.max_upload_size_mb ?? 16}
        onUploaded={onUploaded}
        upload={async (form) => uploadMutation.mutateAsync(form)}
      />
    </div>
  );
}
