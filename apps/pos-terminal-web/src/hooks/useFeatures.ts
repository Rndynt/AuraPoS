import { useTenantFeatures } from "@/lib/api/hooks";

/**
 * Wrapper around useTenantFeatures for backward compatibility
 * Provides the same interface as the old mock-based hook
 */
export function useFeatures() {
  const { data, isLoading, error } = useTenantFeatures();

  const features = data?.features || [];

  const hasFeature = (code: string) => {
    return features.some(f => f.feature_code === code && f.is_active);
  };

  return {
    features,
    loading: isLoading,
    error,
    hasFeature,
  };
}
