"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useGeminiTtsChain } from "@/lib/model-preferences"
import type { GeminiTtsModel } from "@/lib/gemini-tts-models"

type OracleTTSStatus = "idle" | "loading" | "playing" | "paused" | "error"

interface UseOracleTTSResult {
  status: OracleTTSStatus
  errorMessage: string | null
  isAvailable: boolean
  lastModelUsed: string | null
  toggle: () => void
  reset: () => void
}

interface UseOracleTTSOptions {
  text: string
  voice?: string
  onModelUsed?: (model: string) => void
}

interface TTSFetchResult {
  blob: Blob
  modelUsed: string | null
}

async function fetchTTSBlob(
  text: string,
  voice: string | undefined,
  ttsModelChain: readonly GeminiTtsModel[],
): Promise<TTSFetchResult> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, voice, ttsModelChain }),
    cache: "no-store",
  })

  if (!response.ok) {
    let message = `Не удалось получить аудио (статус ${response.status})`

    try {
      const data = (await response.json()) as { error?: string }

      if (data.error) {
        message = data.error
      }
    } catch {
      /* ignore JSON parse errors and fall back to status-based message */
    }

    throw new Error(message)
  }

  const modelUsed = response.headers.get("X-Gemini-Model")
  const blob = await response.blob()

  return { blob, modelUsed }
}

export function useOracleTTS({ text, voice, onModelUsed }: UseOracleTTSOptions): UseOracleTTSResult {
  const [status, setStatus] = useState<OracleTTSStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null)
  const ttsChain = useGeminiTtsChain()
  const ttsChainRef = useRef(ttsChain.chain)
  useEffect(() => {
    ttsChainRef.current = ttsChain.chain
  }, [ttsChain.chain])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const cachedBlobRef = useRef<Blob | null>(null)
  const cachedKeyRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const onModelUsedRef = useRef(onModelUsed)

  useEffect(() => {
    onModelUsedRef.current = onModelUsed
  }, [onModelUsed])

  const trimmedText = text.trim()
  const isAvailable = trimmedText.length > 0
  const cacheKey = `${voice ?? "default"}::${trimmedText}`

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    releaseObjectUrl()
  }, [releaseObjectUrl])

  const reset = useCallback(() => {
    requestIdRef.current += 1
    stopAudio()
    cachedBlobRef.current = null
    cachedKeyRef.current = null
    setStatus("idle")
    setErrorMessage(null)
    setLastModelUsed(null)
  }, [stopAudio])

  useEffect(() => {
    if (cachedKeyRef.current && cachedKeyRef.current !== cacheKey) {
      requestIdRef.current += 1
      stopAudio()
      cachedBlobRef.current = null
      cachedKeyRef.current = null
      setStatus("idle")
      setErrorMessage(null)
      setLastModelUsed(null)
    }
  }, [cacheKey, stopAudio])

  useEffect(() => {
    return () => {
      requestIdRef.current += 1

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const playBlob = useCallback(
    (blob: Blob) => {
      releaseObjectUrl()

      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl

      const audio = new Audio(objectUrl)
      audioRef.current = audio

      audio.onended = () => {
        if (audioRef.current === audio) {
          setStatus("idle")
        }
      }

      audio.onpause = () => {
        if (audioRef.current === audio && !audio.ended && audio.currentTime > 0) {
          setStatus("paused")
        }
      }

      audio.onplay = () => {
        if (audioRef.current === audio) {
          setStatus("playing")
        }
      }

      audio.onerror = () => {
        if (audioRef.current === audio) {
          setStatus("error")
          setErrorMessage("Не удалось воспроизвести аудио")
        }
      }

      void audio.play().catch((error) => {
        if (audioRef.current === audio) {
          setStatus("error")
          setErrorMessage(
            error instanceof Error ? error.message : "Не удалось воспроизвести аудио",
          )
        }
      })
    },
    [releaseObjectUrl],
  )

  const startGeneration = useCallback(async () => {
    if (!isAvailable) {
      return
    }

    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setStatus("loading")
    setErrorMessage(null)

    try {
      const { blob, modelUsed } = await fetchTTSBlob(trimmedText, voice, ttsChainRef.current)

      if (requestId !== requestIdRef.current) {
        return
      }

      cachedBlobRef.current = blob
      cachedKeyRef.current = cacheKey

      if (modelUsed) {
        setLastModelUsed(modelUsed)
        onModelUsedRef.current?.(modelUsed)
      }

      playBlob(blob)
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setStatus("error")
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сгенерировать аудио",
      )
    }
  }, [cacheKey, isAvailable, playBlob, trimmedText, voice])

  const toggle = useCallback(() => {
    if (!isAvailable) {
      return
    }

    if (status === "loading") {
      return
    }

    if (status === "playing" && audioRef.current) {
      audioRef.current.pause()
      return
    }

    if (status === "paused" && audioRef.current) {
      void audioRef.current.play().catch((error) => {
        setStatus("error")
        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось воспроизвести аудио",
        )
      })
      return
    }

    if (cachedBlobRef.current && cachedKeyRef.current === cacheKey) {
      playBlob(cachedBlobRef.current)
      return
    }

    void startGeneration()
  }, [cacheKey, isAvailable, playBlob, startGeneration, status])

  return {
    status,
    errorMessage,
    isAvailable,
    lastModelUsed,
    toggle,
    reset,
  }
}
