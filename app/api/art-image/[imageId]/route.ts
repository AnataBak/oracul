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

export async function GET(_request: Request, context: RouteContext) {
  const { imageId } = await context.params

  if (!isValidImageId(imageId)) {
    return NextResponse.json({ error: "Invalid imageId" }, { status: 400 })
  }

  const imageUrl = `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`
  const imageResponse = await fetch(imageUrl, {
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
