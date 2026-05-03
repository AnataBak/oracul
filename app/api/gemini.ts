const GEMINI_PRIMARY_MODEL = "gemini-2.5-flash-lite"
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text()
  return text || `Request failed with status ${response.status}`
}

function buildGeminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`
}

function isQuotaError(status: number, body: string): boolean {
  const normalizedBody = body.toLowerCase()

  return (
    status === 429 &&
    (normalizedBody.includes("resource_exhausted") ||
      normalizedBody.includes("quota") ||
      normalizedBody.includes("rate limit"))
  )
}

async function requestGeminiModel(
  model: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  const response = await fetch(buildGeminiUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await readErrorBody(response)
    const error = new Error(`Gemini request failed for ${model}: ${errorBody}`)

    error.name = isQuotaError(response.status, errorBody) ? "GeminiQuotaError" : "GeminiRequestError"
    throw error
  }

  const data = (await response.json()) as GeminiResponse
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

  if (!content) {
    throw new Error(`Gemini returned an empty response for ${model}`)
  }

  return content
}

export async function requestGeminiText(prompt: string, temperature: number): Promise<string> {
  try {
    return await requestGeminiModel(GEMINI_PRIMARY_MODEL, prompt, temperature)
  } catch (error) {
    if (error instanceof Error && error.name === "GeminiQuotaError") {
      console.warn(
        `${GEMINI_PRIMARY_MODEL} quota exhausted. Falling back to ${GEMINI_FALLBACK_MODEL}.`,
      )

      return requestGeminiModel(GEMINI_FALLBACK_MODEL, prompt, temperature)
    }

    throw error
  }
}
