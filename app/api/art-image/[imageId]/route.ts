import { NextResponse } from "next/server"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    imageId: string
  }>
}

function isValidImageId(value: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(value)
}

export async function GET(request: Request, context: RouteContext) {
  const { imageId } = await context.params

  if (!isValidImageId(imageId)) {
    return NextResponse.json({ error: "Invalid imageId" }, { status: 400 })
  }

  const size = new URL(request.url).searchParams.get("size") === "full" ? "full" : "843,"
  const imageUrl = `https://www.artic.edu/iiif/2/${imageId}/full/${size}/0/default.jpg`
  const imageResponse = await fetch(imageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.artic.edu/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    },
    cache: "force-cache",
  })

  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: `Art image request failed with status ${imageResponse.status}` },
      { status: imageResponse.status },
    )
  }

  return new Response(imageResponse.body, {
    status: 200,
    headers: {
      "Content-Type": imageResponse.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
