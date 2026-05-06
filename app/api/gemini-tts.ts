const GEMINI_TTS_MODEL_CHAIN = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-pro-preview-tts",
  "gemini-2.5-flash-preview-tts",
]

const DEFAULT_VOICE_NAME = "Kore"
const DEFAULT_SAMPLE_RATE = 24000
const DEFAULT_CHANNELS = 1
const DEFAULT_BITS_PER_SAMPLE = 16

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

function buildWavBuffer(
  pcmData: Buffer,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize = pcmData.length

  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmData])
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
          thinkingConfig: {
            thinkingBudget: 0,
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
  const wavBuffer = buildWavBuffer(
    pcmBuffer,
    sampleRate,
    DEFAULT_CHANNELS,
    DEFAULT_BITS_PER_SAMPLE,
  )

  return {
    buffer: wavBuffer,
    mimeType: "audio/wav",
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
