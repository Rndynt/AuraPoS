import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useDeviceType(): "mobile" | "tablet" | "desktop" {
  const detect = () => {
    const isMobileWidth = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
    const isTabletWidth = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`).matches
    // Require coarse pointer (touch) to treat as actual tablet — rules out small desktop windows
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (isMobileWidth) return "mobile" as const
    if (isTabletWidth && isTouch) return "tablet" as const
    return "desktop" as const
  }

  const [type, setType] = React.useState<"mobile" | "tablet" | "desktop">(detect)

  React.useEffect(() => {
    const mqls = [
      window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`),
      window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`),
    ]
    const update = () => setType(detect())
    mqls.forEach(mql => mql.addEventListener("change", update))
    update()
    return () => mqls.forEach(mql => mql.removeEventListener("change", update))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return type
}

export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = React.useState(
    () => window.matchMedia("(orientation: portrait)").matches
  )

  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)")
    const onChange = (e: MediaQueryListEvent) => setPortrait(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return portrait
}
