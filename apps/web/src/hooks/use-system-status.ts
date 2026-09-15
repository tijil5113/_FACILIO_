import { useQuery } from "@tanstack/react-query";

import { fetchHealth, fetchReadiness } from "@/services/health";

export const healthQueryKey = ["system", "health"] as const;
export const readinessQueryKey = ["system", "readiness"] as const;

export function useHealthQuery() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: fetchHealth,
    retry: false,
  });
}

export function useReadinessQuery() {
  return useQuery({
    queryKey: readinessQueryKey,
    queryFn: fetchReadiness,
    retry: false,
  });
}
