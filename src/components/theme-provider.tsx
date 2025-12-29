"use client"

import * as React from "react"
import { createContext, useContext, useCallback, useRef } from "react"

type Theme = "dark" | "light" | "system"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
})

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

// Apply theme synchronously before any React rendering
const getInitialTheme = (storageKey: string, defaultTheme: Theme): Theme => {
  if (typeof window === "undefined") return defaultTheme
  
  const saved = localStorage.getItem(storageKey)
  if (saved === "dark" || saved === "light" || saved === "system") {
    return saved
  }
  return defaultTheme
}

const applyTheme = (theme: Theme) => {
  if (typeof window === "undefined") return
  
  const root = window.document.documentElement
  root.classList.remove("light", "dark")
  
  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
}: ThemeProviderProps) {
  // Get initial theme and apply it synchronously
  const themeRef = useRef<Theme>(getInitialTheme(storageKey, defaultTheme))
  
  // Apply theme immediately on first render (synchronous)
  if (typeof window !== "undefined") {
    applyTheme(themeRef.current)
  }

  const setTheme = useCallback((newTheme: Theme) => {
    themeRef.current = newTheme
    localStorage.setItem(storageKey, newTheme)
    applyTheme(newTheme)
  }, [storageKey])

  // Stable context value - never changes
  const value = React.useMemo(() => ({
    theme: themeRef.current,
    setTheme,
  }), [setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  return useContext(ThemeContext)
}
