import { Mp3Encoder } from "@breezystack/lamejs"
import { GEMINI_TTS_MODEL_CHAIN } from "@/lib/gemini-tts-models"

const DEFAULT_VOICE_NAME = "Kore"
const DEFAULT_SAMPLE_RATE = 24000
const DEFAULT_CHANNELS = 1
const MP3_BITRATE_KBPS = 64
const MP3_SAMPLES_PER_FRAME = 1152

type GeminiInlineDataField = {
  mimeType?: string
  mime_type?: string
  data?: string
}

type GeminiTTSResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: GeminiInlineDataField
        inline_data?: GeminiInlineDataField
      }>
    }
  }>
}

export type TTSResult = {
  buffer: Buffer
  mimeType: string
  modelUsed: string
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

function buildGeminiTTSUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`
}

function isFallbackEligibleError(status: number, body: string): boolean {
  const normalizedBody = body.toLowerCase()

  return (
    status === 400 ||
    status === 403 ||
    status === 404 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    normalizedBody.includes("resource_exhausted") ||
    normalizedBody.includes("quota") ||
    normalizedBody.includes("rate limit") ||
    normalizedBody.includes("unavailable") ||
    normalizedBody.includes("high demand") ||
    normalizedBody.includes("overloaded") ||
    normalizedBody.includes("temporarily") ||
    normalizedBody.includes("not found") ||
    normalizedBody.includes("not supported") ||
    normalizedBody.includes("permission") ||
    normalizedBody.includes("invalid")
  )
}

function isGeminiTTSFallbackError(error: unknown): error is Error {
  return error instanceof Error && error.name === "GeminiTTSFallbackError"
}

function parseSampleRate(mimeType: string): number {
  const match = mimeType.match(/rate=(\d+)/i)

  if (match) {
    const rate = Number.parseInt(match[1], 10)

    if (Number.isFinite(rate) && rate > 0) {
      return rate
    }
  }

  return DEFAULT_SAMPLE_RATE
}

function pcmBufferToInt16Samples(pcmData: Buffer): Int16Array {
  const samples = new Int16Array(pcmData.length / 2)

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = pcmData.readInt16LE(i * 2)
  }

  return samples
}

function encodePcmToMp3(
  pcmData: Buffer,
  sampleRate: number,
  channels: number,
  bitrateKbps: number,
): Buffer {
  const samples = pcmBufferToInt16Samples(pcmData)
  const encoder = new Mp3Encoder(channels, sampleRate, bitrateKbps)
  const chunks: Buffer[] = []

  for (let offset = 0; offset < samples.length; offset += MP3_SAMPLES_PER_FRAME) {
    const slice = samples.subarray(offset, offset + MP3_SAMPLES_PER_FRAME)
    const encoded = encoder.encodeBuffer(slice)

    if (encoded.length > 0) {
      chunks.push(Buffer.from(encoded))
    }
  }

  const tail = encoder.flush()

  if (tail.length > 0) {
    chunks.push(Buffer.from(tail))
  }

  return Buffer.concat(chunks)
}

async function requestGeminiTTSModel(
  model: string,
  text: string,
  voiceName: string,
): Promise<TTSResult> {
  let response: Response

  try {
    response = await fetch(buildGeminiTTSUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      }),
      cache: "no-store",
    })
  } catch (error) {
    const requestError = new Error(
      `Gemini TTS request failed for ${model}: ${
        error instanceof Error ? error.message : "Network request failed"
      }`,
    )

    requestError.name = "GeminiTTSFallbackError"
    throw requestError
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response)
    const error = new Error(`Gemini TTS request failed for ${model}: ${errorBody}`)

    error.name = isFallbackEligibleError(response.status, errorBody)
      ? "GeminiTTSFallbackError"
      : "GeminiTTSRequestError"
    throw error
  }

  const data = (await response.json()) as GeminiTTSResponse
  const part = data.candidates?.[0]?.content?.parts?.[0]
  const inlineData = part?.inlineData ?? part?.inline_data
  const base64Audio = inlineData?.data
  const sourceMimeType = inlineData?.mimeType ?? inlineData?.mime_type ?? ""

  if (!base64Audio) {
    const error = new Error(`Gemini TTS returned an empty audio response for ${model}`)
    error.name = "GeminiTTSFallbackError"
    throw error
  }

  const pcmBuffer = Buffer.from(base64Audio, "base64")

  if (pcmBuffer.length === 0) {
    const error = new Error(`Gemini TTS returned zero-byte audio for ${model}`)
    error.name = "GeminiTTSFallbackError"
    throw error
  }

  const sampleRate = parseSampleRate(sourceMimeType)
  const mp3Buffer = encodePcmToMp3(
    pcmBuffer,
    sampleRate,
    DEFAULT_CHANNELS,
    MP3_BITRATE_KBPS,
  )

  if (mp3Buffer.length === 0) {
    const error = new Error(`Gemini TTS produced zero-byte MP3 for ${model}`)
    error.name = "GeminiTTSFallbackError"
    throw error
  }

  return {
    buffer: mp3Buffer,
    mimeType: "audio/mpeg",
    modelUsed: model,
  }
}

export async function requestGeminiTTS(
  text: string,
  voiceName: string = DEFAULT_VOICE_NAME,
): Promise<TTSResult> {
  const failures: string[] = []

  for (let index = 0; index < GEMINI_TTS_MODEL_CHAIN.length; index += 1) {
    const model = GEMINI_TTS_MODEL_CHAIN[index]

    try {
      return await requestGeminiTTSModel(model, text, voiceName)
    } catch (error) {
      if (!isGeminiTTSFallbackError(error)) {
        throw error
      }

      failures.push(`${model}: ${error.message}`)

      const nextModel = GEMINI_TTS_MODEL_CHAIN[index + 1]

      if (nextModel) {
        console.warn(
          `Gemini TTS model ${model} is unavailable. Falling back to ${nextModel}.`,
        )
      }
    }
  }

  throw new Error(`All Gemini TTS fallback models failed. ${failures.join(" | ")}`)
}
