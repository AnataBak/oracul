import { GEMINI_TEXT_MODEL_CHAIN } from "@/lib/gemini-models"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

export type GeminiInlineImage = {
  mimeType: string
  data: string
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

function buildGeminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`
}

function isFallbackEligibleError(status: number, body: string): boolean {
  const normalizedBody = body.toLowerCase()

  return (
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
      normalizedBody.includes("temporarily")
  )
}

function isGeminiFallbackError(error: unknown): error is Error {
  return error instanceof Error && error.name === "GeminiFallbackError"
}

async function requestGeminiModel(
  model: string,
  prompt: string,
  temperature: number,
  image?: GeminiInlineImage,
): Promise<string> {
  let response: Response
  const parts = image
    ? [
        {
          inline_data: {
            mime_type: image.mimeType,
            data: image.data,
          },
        },
        { text: prompt },
      ]
    : [{ text: prompt }]

  try {
    response = await fetch(buildGeminiUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature,
        },
      }),
      cache: "no-store",
    })
  } catch (error) {
    const requestError = new Error(
      `Gemini request failed for ${model}: ${
        error instanceof Error ? error.message : "Network request failed"
      }`,
    )

    requestError.name = "GeminiFallbackError"
    throw requestError
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response)
    const error = new Error(`Gemini request failed for ${model}: ${errorBody}`)

    error.name = isFallbackEligibleError(response.status, errorBody)
      ? "GeminiFallbackError"
      : "GeminiRequestError"
    throw error
  }

  const data = (await response.json()) as GeminiResponse
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!content) {
    throw new Error(`Gemini returned an empty response for ${model}`)
  }

  return content
}

export interface GeminiTextResult {
  text: string
  modelUsed: string
}

export async function requestGeminiText(
  prompt: string,
  temperature: number,
  image?: GeminiInlineImage,
  modelChain?: readonly string[],
): Promise<GeminiTextResult> {
  const failures: string[] = []
  const effectiveChain =
    modelChain && modelChain.length > 0 ? modelChain : GEMINI_TEXT_MODEL_CHAIN

  for (let index = 0; index < effectiveChain.length; index += 1) {
    const model = effectiveChain[index]

    try {
      const text = await requestGeminiModel(model, prompt, temperature, image)
      return { text, modelUsed: model }
    } catch (error) {
      if (!isGeminiFallbackError(error)) {
        throw error
      }

      failures.push(`${model}: ${error.message}`)

      const nextModel = effectiveChain[index + 1]

      if (nextModel) {
        console.warn(`${model} is unavailable or rate-limited. Falling back to ${nextModel}.`)
      }
    }
  }

  throw new Error(`All Gemini fallback models failed. ${failures.join(" | ")}`)
}
