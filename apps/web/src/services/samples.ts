import { apiPost } from "@/services/api-client";
import type { DatasetDetail } from "@/types/dataset";

export function importCustomerSample(): Promise<DatasetDetail> {
  return apiPost<DatasetDetail>("/api/v1/samples/customers/import", undefined, 30_000);
}
