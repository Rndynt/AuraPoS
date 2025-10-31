type FeatureCode = {
  code: string;
};

export function isFeatureActive(features: FeatureCode[], code: string): boolean {
  return features.some((f) => f.code === code);
}

export function mergeFeatures(
  planFeatures: FeatureCode[],
  purchasedFeatures: FeatureCode[]
): FeatureCode[] {
  const allCodes = new Set([
    ...planFeatures.map((f) => f.code),
    ...purchasedFeatures.map((f) => f.code),
  ]);
  return Array.from(allCodes).map((code) => ({ code }));
}
