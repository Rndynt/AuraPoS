import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to POS page
    setLocation("/pos");
  }, [setLocation]);

  return null;
}
