import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Auraplay Documentation",
  description: "How to use Auraplay Video Player in any HTML project",
}

export default function DocsPage() {
  const baseUrl = "https://v0-auraplayjsvideoplayer.vercel.app"
  
  // Example JSON source URL (you can replace this with actual hosted JSON)
  const exampleJsonUrl = "https://gist.githubusercontent.com/example/auraplay-demo.json"
  
  // Example video URLs
  const exampleVideoUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
  const exampleCaptionUrl = "https://example.com/captions.vtt"

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-white/20">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
            Auraplay JS
          </h1>
          <p className="text-xl text-neutral-400">A lightweight, modern HTML5 video player library.</p>
        </header>

        <section className="space-y-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Quick Start</h2>
            <p className="text-neutral-400 mb-4">Include the JS and CSS files in your HTML to get started.</p>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 font-mono text-sm overflow-x-auto">
              <pre className="text-neutral-300">
                {`<link rel="stylesheet" href="${baseUrl}/auraplay.css">
<script src="${baseUrl}/auraplay.js"></script>`}
              </pre>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Usage</h2>
            <p className="text-neutral-400 mb-4">
              Add the <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">data-auraplay</code> attribute
              to any container with a video tag.
            </p>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 font-mono text-sm overflow-x-auto">
              <pre className="text-neutral-300">
                {`<div data-auraplay style="max-width: 800px;">
  <video src="video.mp4"></video>
</div>`}
              </pre>
            </div>
          </div>

          {/* <CHANGE> Added embed feature documentation */}
          <div className="pt-8 border-t border-neutral-800">
            <h2 className="text-2xl font-semibold mb-6">Embed Player</h2>
            <p className="text-neutral-400 mb-6">
              Use Auraplay as an embeddable iframe player with dynamic content loading.
            </p>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">Method 1: JSON Source</h3>
                <p className="text-neutral-400 mb-3 text-sm">
                  Load video and multiple caption tracks from a JSON file.
                </p>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 font-mono text-xs overflow-x-auto mb-3">
                  <pre className="text-neutral-300">
                    {`${baseUrl}/embed/?source=<JSON_URL>`}
                  </pre>
                </div>
                
                <details className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-4">
                  <summary className="cursor-pointer text-sm font-medium text-neutral-300 hover:text-white">
                    JSON Format Example
                  </summary>
                  <div className="mt-3 font-mono text-xs overflow-x-auto">
                    <pre className="text-neutral-400">
{`{
  "video": {
    "type": "m3u8",
    "source": {
      "url": "https://example.com/video.m3u8"
    }
  },
  "captions": {
    "tracks": [
      {
        "file": "https://example.com/en.vtt",
        "label": "English",
        "kind": "captions",
        "default": true
      },
      {
        "file": "https://example.com/es.vtt",
        "label": "Spanish",
        "kind": "captions"
      }
    ]
  }
}`}
                    </pre>
                  </div>
                </details>

                <a
                  href={`${baseUrl}/embed/?source=${encodeURIComponent(exampleJsonUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                >
                  View Demo →
                </a>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">Method 2: Direct Video URL</h3>
                <p className="text-neutral-400 mb-3 text-sm">
                  Embed a single video with optional captions.
                </p>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 font-mono text-xs overflow-x-auto mb-3">
                  <pre className="text-neutral-300">
                    {`${baseUrl}/embed/?video=<VIDEO_URL>&caption=<VTT_URL>&language=<LANG>&type=<hls|mp4>`}
                  </pre>
                </div>
                
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium mb-2 text-neutral-300">Parameters:</h4>
                  <ul className="space-y-2 text-xs text-neutral-400">
                    <li>
                      <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">video</code> - Video URL (required)
                    </li>
                    <li>
                      <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">caption</code> - VTT subtitle file URL (optional)
                    </li>
                    <li>
                      <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">language</code> - Caption language code (default: en)
                    </li>
                    <li>
                      <code className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">type</code> - Video type: hls or mp4 (default: mp4)
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${baseUrl}/embed/?video=${encodeURIComponent(exampleVideoUrl)}&type=hls`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                  >
                    Demo: HLS Video →
                  </a>
                  <a
                    href={`${baseUrl}/embed/?video=${encodeURIComponent(exampleVideoUrl)}&caption=${encodeURIComponent(exampleCaptionUrl)}&language=en&type=hls`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm font-medium border border-neutral-700"
                  >
                    Demo: With Captions →
                  </a>
                </div>
              </div>

              <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 text-blue-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Embed Example
                </h4>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 font-mono text-xs overflow-x-auto mt-3">
                  <pre className="text-neutral-300">
{`<iframe
  src="${baseUrl}/embed/?video=VIDEO_URL&type=hls"
  width="800"
  height="450"
  frameborder="0"
  allowfullscreen
></iframe>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-800">
            <h2 className="text-2xl font-semibold mb-4">Features</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-neutral-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Automatic thumbnail generation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Modern hover effects & icons
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Progress bar time tooltip
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                PiP & Fullscreen support
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                HLS streaming with quality switching
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Multiple caption track support
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Keyboard shortcuts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Custom context menu
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
