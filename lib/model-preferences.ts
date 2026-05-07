"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  GEMINI_TEXT_MODEL_CHAIN,
  sanitizeGeminiTextChain,
  type GeminiTextModel,
} from "@/lib/gemini-models"
import {
  GEMINI_TTS_MODEL_CHAIN,
  sanitizeGeminiTtsChain,
  type GeminiTtsModel,
} from "@/lib/gemini-tts-models"

export const TEXT_CHAIN_STORAGE_KEY = "oracle:gemini-text-chain"
export const TTS_CHAIN_STORAGE_KEY = "oracle:gemini-tts-chain"

function readStoredChain<T extends string>(
  key: string,
  sanitize: (value: unknown) => T[] | null,
  fallback: readonly T[],
): T[] {
  if (typeof window === "undefined") {
    return [...fallback]
  }

  try {
    const raw = window.localStorage.getItem(key)

    if (!raw) {
      return [...fallback]
    }

    const parsed = JSON.parse(raw) as unknown
    const sanitized = sanitize(parsed)

    return sanitized && sanitized.length > 0 ? sanitized : [...fallback]
  } catch {
    return [...fallback]
  }
}

function writeStoredChain<T extends string>(key: string, chain: T[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(chain))
  } catch {
    /* ignore quota errors */
  }
}

function clearStoredChain(key: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

interface UseModelChainResult<T extends string> {
  chain: T[]
  defaultChain: readonly T[]
  isCustom: boolean
  moveUp: (index: number) => void
  moveDown: (index: number) => void
  reset: () => void
}

function useModelChain<T extends string>(
  storageKey: string,
  defaultChain: readonly T[],
  sanitize: (value: unknown) => T[] | null,
): UseModelChainResult<T> {
  const [chain, setChain] = useState<T[]>(() => [...defaultChain])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setChain(readStoredChain<T>(storageKey, sanitize, defaultChain))
    setHydrated(true)
  }, [storageKey, sanitize, defaultChain])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return
      }

      setChain(readStoredChain<T>(storageKey, sanitize, defaultChain))
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [storageKey, sanitize, defaultChain])

  const persist = useCallback(
    (next: T[]) => {
      setChain(next)
      writeStoredChain(storageKey, next)
    },
    [storageKey],
  )

  const moveUp = useCallback(
    (index: number) => {
      if (!hydrated || index <= 0 || index >= chain.length) {
        return
      }

      const next = [...chain]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      persist(next)
    },
    [chain, hydrated, persist],
  )

  const moveDown = useCallback(
    (index: number) => {
      if (!hydrated || index < 0 || index >= chain.length - 1) {
        return
      }

      const next = [...chain]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      persist(next)
    },
    [chain, hydrated, persist],
  )

  const reset = useCallback(() => {
    setChain([...defaultChain])
    clearStoredChain(storageKey)
  }, [defaultChain, storageKey])

  const isCustom = useMemo(() => {
    if (chain.length !== defaultChain.length) {
      return true
    }

    return chain.some((model, index) => model !== defaultChain[index])
  }, [chain, defaultChain])

  return { chain, defaultChain, isCustom, moveUp, moveDown, reset }
}

export function useGeminiTextChain(): UseModelChainResult<GeminiTextModel> {
  return useModelChain<GeminiTextModel>(
    TEXT_CHAIN_STORAGE_KEY,
    GEMINI_TEXT_MODEL_CHAIN,
    sanitizeGeminiTextChain,
  )
}

export function useGeminiTtsChain(): UseModelChainResult<GeminiTtsModel> {
  return useModelChain<GeminiTtsModel>(
    TTS_CHAIN_STORAGE_KEY,
    GEMINI_TTS_MODEL_CHAIN,
    sanitizeGeminiTtsChain,
  )
}
