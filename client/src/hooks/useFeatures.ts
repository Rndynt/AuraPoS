import { useState, useEffect } from "react";
import { Feature, getActiveFeatures, hasFeature as checkFeature } from "@/lib/mockData";

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call //todo: remove mock functionality
    setTimeout(() => {
      setFeatures(getActiveFeatures());
      setLoading(false);
    }, 100);
  }, []);

  const hasFeature = (code: string) => {
    return checkFeature(features, code);
  };

  const activateFeature = (feature: Feature) => {
    console.log("Activating feature:", feature.code);
    setFeatures([...features, feature]);
  };

  return {
    features,
    loading,
    hasFeature,
    activateFeature,
  };
}
