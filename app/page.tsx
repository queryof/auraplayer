import { Auraplay } from "@/components/auraplay"

export default function Page() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-8 space-y-12">
      <div className="max-w-4xl w-full text-center space-y-4">
        <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
          Auraplay<span className="text-white/40">.js</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          A high-performance, modular video player built for the modern web. Native HLS support, advanced caption system,
          and intelligent quality switching.
        </p>
      </div>

      <div className="max-w-5xl w-full">
        <Auraplay
          src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1920"
          className="shadow-2xl shadow-white/5 border border-white/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full py-12 border-t border-white/10">
        <div className="space-y-2">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs">Core Engine</h3>
          <p className="text-white/40 text-sm leading-relaxed">
            Fully integrated with HLS.js for seamless streaming. Supports adaptive bitrate switching, multi-audio, and caption customization.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs">Visual Identity</h3>
          <p className="text-white/40 text-sm leading-relaxed">
            Hand-crafted SVG icons designed specifically for Auraplay. No external dependencies, just pure vector
            geometry.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-white font-bold uppercase tracking-widest text-xs">Interaction</h3>
          <p className="text-white/40 text-sm leading-relaxed">
            Picture-in-Picture, immersive Fullscreen, and keyboard shortcuts. Built for a cinematic viewing experience.
          </p>
        </div>
      </div>
    </main>
  )
}
