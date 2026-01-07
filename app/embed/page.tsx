"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Auraplay } from "@/components/auraplay"

function EmbedPlayer() {
  const searchParams = useSearchParams()

  const EMBED_PARAMS = new Set(["source", "video", "caption", "language", "skip"])

  const sourceUrl = searchParams.get("source")
  const videoUrl = searchParams.get("video")
  const captionUrl = searchParams.get("caption")
  const language = searchParams.get("language") || "en"
  const skipParam = searchParams.get("skip")

  let finalSourceUrl = sourceUrl
  if (sourceUrl) {
    // Extract all unknown params and append them back to source URL
    const unknownParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (!EMBED_PARAMS.has(key)) {
        unknownParams.append(key, value)
      }
    })

    if (unknownParams.toString()) {
      const separator = sourceUrl.includes("?") ? "&" : "?"
      finalSourceUrl = sourceUrl + separator + unknownParams.toString()
    }
  }

  if (!finalSourceUrl && !videoUrl) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white p-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-bold">No video source provided</h1>
          <p className="text-sm text-gray-400">
            Use <code className="bg-gray-800 px-1 rounded">?source=...</code> or{" "}
            <code className="bg-gray-800 px-1 rounded">?video=...</code> parameters to load a video.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <Auraplay
        sourceUrl={finalSourceUrl || undefined}
        src={videoUrl || undefined}
        captionUrl={captionUrl || undefined}
        captionLanguage={language}
        videoType="mp4"
        skipRanges={skipParam || undefined}
        className="w-full h-full"
      />
    </div>
  )
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-black" />}>
      <EmbedPlayer />
    </Suspense>
  )
}
