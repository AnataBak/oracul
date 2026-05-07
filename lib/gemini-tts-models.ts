export const GEMINI_TTS_MODEL_CHAIN = [
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-pro-preview-tts",
] as const

export type GeminiTtsModel = (typeof GEMINI_TTS_MODEL_CHAIN)[number]
