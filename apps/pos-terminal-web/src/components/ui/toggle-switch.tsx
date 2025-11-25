import { useState, useEffect } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  isLoading?: boolean;
  disabled?: boolean;
  "data-testid"?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  size = "md",
  isLoading = false,
  disabled = false,
  "data-testid": dataTestId,
}: ToggleSwitchProps) {
  const isSmall = size === "sm";
  const containerClass = isSmall ? "w-8 h-4" : "w-11 h-6";
  const circleClass = isSmall ? "w-3 h-3" : "w-4 h-4";
  const startPos = isSmall ? "left-0.5" : "left-1";
  const translateClass = isSmall ? "translate-x-4" : "translate-x-5";
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isLoading) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!isLoading && !disabled) {
          onChange(!checked);
        }
      }}
      data-testid={dataTestId}
      disabled={isLoading || disabled}
      className={`
        ${containerClass} 
        rounded-full transition-all duration-300 ease-in-out focus:outline-none flex-shrink-0 relative overflow-hidden flex items-center justify-center
        ${checked ? "bg-blue-600" : "bg-slate-300"}
        ${isLoading || disabled ? "cursor-not-allowed" : "cursor-pointer"}
      `}
      role="switch"
      aria-checked={checked}
    >
      {isLoading ? (
        <span className="text-white text-[8px] font-bold h-4 flex items-center leading-none">
          {dots}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`
            ${circleClass}
            pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition-all duration-300 ease-in-out absolute top-1/2 -translate-y-1/2
            ${startPos}
            ${checked ? translateClass : "translate-x-0"}
          `}
        />
      )}
    </button>
  );
}
