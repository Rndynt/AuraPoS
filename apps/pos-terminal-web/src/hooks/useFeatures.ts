import { useTenantFeatures } from "@/lib/api/hooks";

export function useFeatures() {
  const { data, isLoading, error } = useTenantFeatures();

  const features = data?.features || [];

  const hasFeature = (code: string): boolean => {
    if (isLoading) return true;
    return features.some(f => f.feature_code === code && f.is_active);
  };

  return {
    features,
    loading: isLoading,
    error,
    hasFeature,
  };
}
