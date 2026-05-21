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
  const [type, setType] = React.useState<"mobile" | "tablet" | "desktop">("desktop")

  React.useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < MOBILE_BREAKPOINT) setType("mobile")
      else if (w < TABLET_BREAKPOINT) setType("tablet")
      else setType("desktop")
    }
    window.addEventListener("resize", update)
    update()
    return () => window.removeEventListener("resize", update)
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
