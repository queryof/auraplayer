"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import Hls from "hls.js"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"
import {
  PlayIcon,
  PauseIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMutedIcon,
  FullscreenIcon,
  FullscreenExitIcon,
  PipIcon,
  SettingsIcon,
  SubtitlesIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon, // Added for settings menu navigation
  InfoIcon,
  ActivityIcon,
  ExternalLinkIcon,
  CopyIcon,
  KeyboardIcon,
} from "./auraplay-icons"

type CaptionTrack = {
  file: string
  label: string
  kind: string
  default?: boolean
}

type QualityLevel = {
  id: number
  height: number
  bitrate: number
}

type AudioTrack = {
  id: number
  name: string
  lang: string
}

type CaptionSettings = {
  size: number
  color: string
  backgroundColor: string
  position: "top" | "center" | "bottom"
  fontFamily: string
  opacity: number
  outlineWidth: number
  outlineColor: string
  shadowBlur: number
  shadowOffset: number
  shadowColor: string
}

type VideoSettings = {
  flip: boolean
  rotate: 0 | 90 | 180 | 270
  brightness: number
  contrast: number
  saturation: number
  aspectRatio: "auto" | "16:9" | "4:3" | "1:1" | "stretch"
}

type SkipRange = {
  start: number
  end: number
  name?: string // add optional name for JSON-based skips
}

type AuraplayProps = {
  src: string
  poster: string
  className: string
  autoPlay: boolean
  sourceUrl: string
  captionUrl: string
  captionLanguage: string
  videoType: string
  skipRanges?: string
  skipData?: Array<{ start: number; end: number; name?: string }> // add JSON skip data prop
}

export function Auraplay({
  src: initialSrc,
  poster: initialPoster,
  className,
  autoPlay = false,
  sourceUrl,
  captionUrl,
  captionLanguage = "en",
  videoType = "mp4",
  skipRanges,
  skipData, // add skipData prop
}: AuraplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [jsonData, setJsonData] = useState<any>(null)
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([])
  const [currentCaption, setCurrentCaption] = useState<number>(-1)

  const [src, setSrc] = useState(initialSrc || "")
  const [poster, setPoster] = useState(initialPoster || "")
  const [captionUrlState, setCaptionUrlState] = useState(captionUrl || "")

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedRanges, setBufferedRanges] = useState<{ start: number; end: number }[]>([])
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isPip, setIsPip] = useState(false)

  const [qualities, setQualities] = useState<QualityLevel[]>([])
  const [currentQuality, setCurrentQuality] = useState<number>(-1)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(0)

  const [showSettings, setShowSettings] = useState(false)
  // Renamed settingsView to settingsMenu for clarity
  const [settingsMenu, setSettingsMenu] = useState<
    "main" | "quality" | "speed" | "advanced" | "captions" | "captionSettings" | "video" | "audio" | null
  >(null)

  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<"auto" | "16:9" | "4:3" | "1:1" | "stretch">("auto")
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showStats, setShowStats] = useState(false)

  const [networkStats, setNetworkStats] = useState({
    speed: "0 Mbps",
    ping: "0 ms",
    droppedFrames: 0,
    decodedFrames: 0,
    history: [] as number[],
  })

  const [textTracks, setTextTracks] = useState<TextTrack[]>([])
  const [currentCaptionTrack, setCurrentCaptionTrack] = useState<number>(-1)
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [captionSettings, setCaptionSettings] = useState<CaptionSettings>({
    size: 100,
    color: "#FFFFFF",
    backgroundColor: "#000000",
    position: "bottom",
    fontFamily: "Arial",
    opacity: 0.8,
    outlineWidth: 2,
    outlineColor: "#000000",
    shadowBlur: 4,
    shadowOffset: 2,
    shadowColor: "#000000",
  })

  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    flip: false,
    rotate: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    aspectRatio: "auto",
  })

  const [actionToast, setActionToast] = useState<{ icon: React.ReactNode; text: string } | null>(null)

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statsIntervalRef = useRef<NodeJS.Interval | null>(null) // Changed type to NodeJS.Interval
  const lastLoadedBytesRef = useRef(0)
  const lastTimeRef = useRef(Date.now())

  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState(0)
  const [videoPoster, setVideoPoster] = useState(initialPoster)

  const [skipRangesList, setSkipRangesList] = useState<SkipRange[]>([])
  const [currentSkipRange, setCurrentSkipRange] = useState<SkipRange | null>(null)

  useEffect(() => {
    if (!videoRef.current || videoPoster) return

    const video = videoRef.current
    const handleLoadedData = () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        setVideoPoster(canvas.toDataURL("image/jpeg"))
      }
    }

    video.addEventListener("loadeddata", handleLoadedData)
    return () => video.removeEventListener("loadeddata", handleLoadedData)
  }, [videoPoster])

  useEffect(() => {
    if (!videoRef.current || !showStats) return

    statsIntervalRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video) return

      // Network Information API
      const connection = (navigator as any).connection
      let speed = "N/A"
      let ping = "N/A"

      if (connection) {
        const downlink = connection.downlink || 0
        speed = `${downlink.toFixed(1)} Mbps`
        ping = connection.rtt ? `${connection.rtt} ms` : "N/A"
      }

      // Video quality stats
      const quality = (video as any).getVideoPlaybackQuality?.()
      const decoded = quality?.totalVideoFrames || 0
      const dropped = quality?.droppedVideoFrames || 0

      // Generate history (simulated network activity)
      const activity = Math.random() * 100
      const newHistory = [...networkStats.history, activity].slice(-20)

      setNetworkStats({
        speed,
        ping,
        decodedFrames: decoded,
        droppedFrames: dropped,
        history: newHistory,
      })
    }, 1000) // Update every 1 second

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
    }
  }, [showStats])

  useEffect(() => {
    if (actionToast) {
      const timer = setTimeout(() => setActionToast(null), 800)
      return () => clearTimeout(timer)
    }
  }, [actionToast])

  const loadVideo = useCallback(
    (src: string, externalCaptionUrl?: string) => {
      const video = videoRef.current
      if (!video) return

      setIsLoading(true)
      setSrc(src) // Update internal src state

      // Clean up existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (videoType === "hls" || src.includes(".m3u8")) {
        if (Hls.isSupported()) {
          const hls = new Hls()
          hlsRef.current = hls
          hls.loadSource(src)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            // Get quality levels
            const levels =
              hls.levels.map((l, idx) => ({
                id: idx,
                height: l.height,
                bitrate: l.bitrate,
              })) || []
            setQualities(levels)

            // Get audio tracks
            const audioTracks =
              hls.audioTracks.map((track, idx) => ({
                id: idx,
                name: track.name || `Audio ${idx + 1}`,
                lang: track.lang || "unknown",
              })) || []
            setAudioTracks(audioTracks)

            setIsLoading(false)

            if (autoPlay) {
              try {
                await video.play()
                setIsPlaying(true)
              } catch (error) {
                if ((error as Error).name !== "AbortError") {
                  console.error("AutoPlay failed:", error)
                }
              }
            }
          })

          hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            if (currentQuality === -1) {
              // Auto mode, update display
              setCurrentQuality(-1)
            }
          })
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src
          video.addEventListener("loadedmetadata", async () => {
            setIsLoading(false)
            if (autoPlay) {
              try {
                await video.play()
                setIsPlaying(true)
              } catch (error) {
                if ((error as Error).name !== "AbortError") {
                  console.error("AutoPlay failed:", error)
                }
              }
            }
          })
        }
      } else {
        video.src = src
        setIsLoading(false)
      }

      // Load external caption if provided
      if (externalCaptionUrl) {
        // Remove existing tracks
        Array.from(video.textTracks).forEach((track) => {
          if ((track as any).external) {
            const trackElement = Array.from(video.querySelectorAll("track")).find((t) => t.track === track)
            trackElement?.remove()
          }
        })

        const trackElement = document.createElement("track")
        trackElement.kind = "subtitles"
        trackElement.label = "External Subtitles"
        trackElement.srclang = "en"
        trackElement.src = externalCaptionUrl
        ;(trackElement.track as any).external = true
        video.appendChild(trackElement)

        trackElement.addEventListener("load", () => {
          updateTextTracks()
          setCaptionsEnabled(true)
          trackElement.track.mode = "showing"
        })
      }
    },
    [autoPlay, currentQuality, videoType], // Added videoType dependency
  )

  useEffect(() => {
    if (sourceUrl) {
      fetch(sourceUrl)
        .then((res) => res.json())
        .then((data) => {
          console.log("[v0] Loaded JSON data:", data)
          setJsonData(data)

          // Set video source from JSON
          if (data.video?.source?.url) {
            setSrc(data.video.source.url)
          }

          // Set caption tracks from JSON
          if (data.captions?.tracks) {
            setCaptionTracks(data.captions.tracks)

            // Find default caption
            const defaultIndex = data.captions.tracks.findIndex((t: CaptionTrack) => t.default)
            if (defaultIndex !== -1) {
              setCurrentCaption(defaultIndex)
            }
          }

          if (data.skip?.length > 0) {
            console.log("[v0] Skip ranges loaded from JSON:", data.skip)
            setSkipRangesList(data.skip)
          }
        })
        .catch((err) => console.error("[v0] Failed to fetch source JSON:", err))
    } else if (captionUrlState) {
      // Handle direct caption URL parameter
      setCaptionTracks([
        {
          file: captionUrlState,
          label: captionLanguage,
          kind: "captions",
          default: true,
        },
      ])
      setCurrentCaption(0)
    }
  }, [sourceUrl, captionUrlState, captionLanguage])

  useEffect(() => {
    if (src) {
      // Use internal src state
      loadVideo(src)
    }
  }, [src, loadVideo]) // Depend on internal src state

  const handleLoadVideo = () => {
    if (src) {
      // Use internal src state
      loadVideo(src, captionUrlState || undefined)
    }
  }

  const updateTextTracks = () => {
    if (!videoRef.current) return
    const tracks = Array.from(videoRef.current.textTracks)
    setTextTracks(tracks)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleWaiting = () => setIsLoading(true)
    const handleProgress = () => {
      const ranges = []
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) })
      }
      setBufferedRanges(ranges)
    }

    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("progress", handleProgress)
    video.addEventListener("loadedmetadata", updateTextTracks)

    return () => {
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("progress", handleProgress)
      video.removeEventListener("loadedmetadata", updateTextTracks)
      if (hlsRef.current) hlsRef.current.destroy()
    }
  }, [])

  useEffect(() => {
    if (skipData && skipData.length > 0) {
      console.log("[v0] Skip data from JSON:", skipData)
      setSkipRangesList(skipData)
    } else if (skipRanges) {
      try {
        const ranges = skipRanges.split(",").map((range) => {
          const [start, end] = range.split("-").map(Number)
          return { start, end }
        })
        console.log("[v0] Skip ranges parsed from URL:", ranges)
        setSkipRangesList(ranges)
      } catch (error) {
        console.error("Failed to parse skip ranges:", error)
      }
    }
  }, [skipRanges, skipData])

  useEffect(() => {
    const inSkipRange = skipRangesList.find((range) => currentTime >= range.start && currentTime < range.end)
    if (inSkipRange) {
      console.log("[v0] In skip range:", inSkipRange, "current time:", currentTime)
    }
    setCurrentSkipRange(inSkipRange || null)
  }, [currentTime, skipRangesList])

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current
    // Remove all existing text tracks
    const tracks = video.querySelectorAll("track")
    tracks.forEach((track) => track.remove())

    // Add selected caption track
    if (currentCaption >= 0 && captionTracks[currentCaption]) {
      const track = document.createElement("track")
      track.kind = "captions"
      track.label = captionTracks[currentCaption].label
      track.srclang = captionTracks[currentCaption].label.split(" ")[0].toLowerCase()
      track.src = captionTracks[currentCaption].file
      track.default = true
      video.appendChild(track)

      // Enable the track
      setTimeout(() => {
        if (video.textTracks.length > 0) {
          video.textTracks[0].mode = "showing"
        }
      }, 100)
    }
  }, [currentCaption, captionTracks])

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current
    const tracks = video.textTracks

    // Ensure currentCaptionTrack is valid
    const trackIndex = Array.from(tracks).findIndex((t) => t.mode === "showing")
    const currentTrack = trackIndex !== -1 ? tracks[trackIndex] : null

    if (currentTrack) {
      const cues = currentTrack.cues
      if (cues) {
        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i] as any
          if (cue.line !== undefined) {
            // Apply position
            if (captionSettings.position === "top") cue.line = 0
            if (captionSettings.position === "center") cue.line = 50
            if (captionSettings.position === "bottom") cue.line = -2
          }
        }
      }
    }

    // Apply styles via CSS
    const style = document.getElementById("auraplay-caption-style") || document.createElement("style")
    style.id = "auraplay-caption-style"
    style.textContent = `
      video::cue {
        font-size: ${captionSettings.size}%;
        color: ${captionSettings.color};
        background-color: ${captionSettings.backgroundColor}${Math.round(captionSettings.opacity * 255)
          .toString(16)
          .padStart(2, "0")};
        font-family: ${captionSettings.fontFamily}, sans-serif;
        line-height: 1.2; /* Improved line height */
        text-shadow: ${captionSettings.shadowOffset}px ${captionSettings.shadowOffset}px ${captionSettings.shadowBlur}px ${captionSettings.shadowColor};
        -webkit-text-stroke: ${captionSettings.outlineWidth}px ${captionSettings.outlineColor};
      }
    `
    if (!document.getElementById("auraplay-caption-style")) {
      document.head.appendChild(style)
    }
  }, [captionSettings, currentCaptionTrack]) // Removed currentCaptionTrack from dependencies, as it's not directly used for styling

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault()
          togglePlay()
          break
        case "m":
          toggleMute()
          break
        case "f":
          toggleFullscreen()
          break
        case "j":
          if (videoRef.current) {
            videoRef.current.currentTime -= 10
            setActionToast({ icon: <div className="text-2xl">-10s</div>, text: "" })
          }
          break
        case "l":
          if (videoRef.current) {
            videoRef.current.currentTime += 10
            setActionToast({ icon: <div className="text-2xl">+10s</div>, text: "" })
          }
          break
        case "arrowleft":
          if (videoRef.current) {
            videoRef.current.currentTime -= 5
            setActionToast({ icon: <div className="text-2xl">-5s</div>, text: "" })
          }
          break
        case "arrowright":
          if (videoRef.current) {
            videoRef.current.currentTime += 5
            setActionToast({ icon: <div className="text-2xl">+5s</div>, text: "" })
          }
          break
        case "arrowup":
          e.preventDefault()
          const nextVolUp = Math.min(1, volume + 0.1)
          handleVolumeChange({ target: { value: nextVolUp.toString() } } as any)
          setActionToast({ icon: <VolumeHighIcon className="w-8 h-8" />, text: `Vol ${Math.round(nextVolUp * 100)}%` })
          break
        case "arrowdown":
          e.preventDefault()
          const nextVolDown = Math.max(0, volume - 0.1)
          handleVolumeChange({ target: { value: nextVolDown.toString() } } as any)
          setActionToast({ icon: <VolumeLowIcon className="w-8 h-8" />, text: `Vol ${Math.round(nextVolDown * 100)}%` })
          break
        case "n":
          updatePlaybackSpeed(1)
          setActionToast({ icon: <SettingsIcon className="w-8 h-8" />, text: "Normal" })
          break
        case "s":
          takeScreenshot()
          setActionToast({ icon: <SettingsIcon className="w-8 h-8" />, text: "Screenshot" })
          break
        case "p":
          togglePip()
          break
        case ">":
          if (e.shiftKey) {
            const newSpeed = Math.min(2, playbackSpeed + 0.25)
            updatePlaybackSpeed(newSpeed)
            setActionToast({ icon: <div className="text-xl">{newSpeed}x</div>, text: "" })
          }
          break
        case "<":
          if (e.shiftKey) {
            const newSpeed = Math.max(0.25, playbackSpeed - 0.25)
            updatePlaybackSpeed(newSpeed)
            setActionToast({ icon: <div className="text-xl">{newSpeed}x</div>, text: "" })
          }
          break
        case "escape":
          if (isFullscreen) toggleFullscreen()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, isFullscreen, playbackSpeed, isMuted, volume])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null)
      }
    }
    window.addEventListener("click", handleClickOutside)
    return () => window.removeEventListener("click", handleClickOutside)
  }, [contextMenu])

  const togglePlay = useCallback(async () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        try {
          await videoRef.current.play()
          setIsPlaying(true)
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.error("Playback failed:", error)
          }
        }
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      updateTextTracks()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setVolume(value)
    if (videoRef.current) {
      videoRef.current.volume = value
      setIsMuted(value === 0)
    }
  }

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (videoRef.current) {
      videoRef.current.muted = newMuted
      if (newMuted) {
        setVolume(0)
      } else {
        setVolume(1)
        videoRef.current.volume = 1
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPip(false)
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture()
        setIsPip(true)
      }
    } catch (error) {
      console.error("PiP failed", error)
    }
  }

  const toggleCaptions = () => {
    if (!videoRef.current) return
    const newState = !captionsEnabled
    setCaptionsEnabled(newState)

    // Ensure we affect the correct track even if one isn't explicitly active in state
    const tracks = videoRef.current.textTracks
    if (currentCaptionTrack >= 0 && tracks[currentCaptionTrack]) {
      tracks[currentCaptionTrack].mode = newState ? "showing" : "hidden"
    } else {
      // Fallback: Toggle the first available subtitle track if no selection exists
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].kind === "subtitles" || tracks[i].kind === "captions") {
          tracks[i].mode = newState ? "showing" : "hidden"
          if (newState) setCurrentCaptionTrack(i)
          break
        }
      }
    }
  }

  const selectCaptionTrack = (index: number) => {
    if (!videoRef.current) return

    // Hide all tracks
    for (let i = 0; i < videoRef.current.textTracks.length; i++) {
      videoRef.current.textTracks[i].mode = "hidden"
    }

    // Show selected track
    if (index >= 0 && videoRef.current.textTracks[index]) {
      videoRef.current.textTracks[index].mode = "showing"
      setCurrentCaptionTrack(index)
      setCaptionsEnabled(true)
    } else {
      setCurrentCaptionTrack(-1)
      setCaptionsEnabled(false)
    }
  }

  const selectQuality = (qualityId: number) => {
    if (!hlsRef.current) return

    if (qualityId === -1) {
      hlsRef.current.currentLevel = -1 // Auto
    } else {
      hlsRef.current.currentLevel = qualityId
    }
    setCurrentQuality(qualityId)
  }

  const selectAudioTrack = (trackId: number) => {
    if (!hlsRef.current) return
    hlsRef.current.audioTrack = trackId
    setCurrentAudioTrack(trackId)
  }

  const updatePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const takeScreenshot = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.download = `auraplay-shot-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    setHoverTime(time)
    setHoverPosition(percentage * 100)
  }

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null)
  }

  // Filter out qualities that are not available
  const availableQualities = qualities.filter((q) => q.height > 0 && q.bitrate > 0)

  // Helper function for quality switching
  const switchQuality = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId
      setCurrentQuality(qualityId)
    }
  }

  const handleSkip = useCallback(() => {
    if (currentSkipRange && videoRef.current) {
      videoRef.current.currentTime = currentSkipRange.end
    }
  }, [currentSkipRange])

  // Render settings menu
  const renderSettingsMenu = () => {
    if (settingsMenu === null) return null

    return (
      <div
        className="absolute bottom-20 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 z-50"
        style={{
          width: "320px",
          maxHeight: "60vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* MAIN MENU */}
        {settingsMenu === "main" && (
          <div className="flex flex-col overflow-y-auto flex-1">
            <div className="p-3 space-y-1">
              <button
                onClick={() => setSettingsMenu("captions")}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SubtitlesIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Captions</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
              </button>
              <button
                onClick={() => setSettingsMenu("speed")}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Speed</span>
                </div>
                <div className="text-xs text-gray-400">{playbackSpeed}x</div>
              </button>
              {availableQualities.length > 1 && (
                <button
                  onClick={() => setSettingsMenu("quality")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <InfoIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Quality</span>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
                </button>
              )}
              <button
                onClick={() => setSettingsMenu("video")}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 flex-shrink-0" />
                  <span>Video Settings</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* CAPTIONS MENU */}
        {settingsMenu === "captions" && (
          <div className="flex flex-col overflow-hidden flex-1">
            <button
              onClick={() => setSettingsMenu("main")}
              className="px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 border-b border-gray-700 flex-shrink-0 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="font-medium">Captions</span>
            </button>
            <div className="overflow-y-auto flex-1">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setCurrentCaption(-1)
                    setSettingsMenu(null)
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded transition-colors flex items-center justify-between",
                    currentCaption === -1 && "text-blue-400 bg-gray-800/50",
                  )}
                >
                  <span>Off</span>
                  {currentCaption === -1 && <CheckIcon className="w-4 h-4" />}
                </button>
                {captionTracks.map((track, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentCaption(index)
                      setSettingsMenu(null)
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded transition-colors flex items-center justify-between",
                      currentCaption === index && "text-blue-400 bg-gray-800/50",
                    )}
                  >
                    <span>{track.label}</span>
                    {currentCaption === index && <CheckIcon className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSettingsMenu("captionSettings")}
              className="px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center justify-between border-t border-gray-700 flex-shrink-0 transition-colors"
            >
              <span>Options</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CAPTION OPTIONS */}
        {settingsMenu === "captionSettings" && (
          <div className="flex flex-col overflow-hidden flex-1">
            <button
              onClick={() => setSettingsMenu("captions")}
              className="px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 border-b border-gray-700 flex-shrink-0 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="font-medium">Caption Options</span>
            </button>
            <div className="overflow-y-auto flex-1 px-3 py-2 space-y-3">
              {/* Text Size */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Size</span>
                <div className="flex gap-1">
                  {[
                    { label: "S", value: 75 },
                    { label: "M", value: 100 },
                    { label: "L", value: 125 },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setCaptionSettings({ ...captionSettings, size: item.value })}
                      className={cn(
                        "flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded",
                        captionSettings.size === item.value && "bg-blue-500/50",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Color */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Text Color</span>
                <input
                  type="color"
                  value={captionSettings.color}
                  onChange={(e) => setCaptionSettings({ ...captionSettings, color: e.target.value })}
                  className="w-full h-7 rounded border-none cursor-pointer"
                />
              </div>

              {/* Background Color */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">BG Color</span>
                <input
                  type="color"
                  value={captionSettings.backgroundColor}
                  onChange={(e) => setCaptionSettings({ ...captionSettings, backgroundColor: e.target.value })}
                  className="w-full h-7 rounded border-none cursor-pointer"
                />
              </div>

              {/* Position */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Position</span>
                <div className="flex gap-1">
                  {["Top", "Mid", "Bot"].map((pos, idx) => {
                    const posValue = ["top", "center", "bottom"][idx]
                    return (
                      <button
                        key={posValue}
                        onClick={() => setCaptionSettings({ ...captionSettings, position: posValue })}
                        className={cn(
                          "flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded",
                          captionSettings.position === posValue && "bg-blue-500/50",
                        )}
                      >
                        {pos}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Opacity */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={captionSettings.opacity}
                  onChange={(e) => setCaptionSettings({ ...captionSettings, opacity: Number(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-full cursor-pointer accent-blue-500"
                />
              </div>

              {/* Outline */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Outline</span>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={captionSettings.outlineColor}
                    onChange={(e) => setCaptionSettings({ ...captionSettings, outlineColor: e.target.value })}
                    className="w-7 h-7 rounded border-none cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={captionSettings.outlineWidth}
                    onChange={(e) => setCaptionSettings({ ...captionSettings, outlineWidth: Number(e.target.value) })}
                    className="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Shadow */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Shadow</span>
                <div className="space-y-1">
                  <input
                    type="color"
                    value={captionSettings.shadowColor}
                    onChange={(e) => setCaptionSettings({ ...captionSettings, shadowColor: e.target.value })}
                    className="w-full h-7 rounded border-none cursor-pointer"
                  />
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={captionSettings.shadowBlur}
                    onChange={(e) => setCaptionSettings({ ...captionSettings, shadowBlur: Number(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-full cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SPEED MENU */}
        {settingsMenu === "speed" && (
          <div className="flex flex-col overflow-hidden flex-1">
            <button
              onClick={() => setSettingsMenu("main")}
              className="px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 border-b border-gray-700 flex-shrink-0 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="font-medium">Speed</span>
            </button>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed)
                    videoRef.current && (videoRef.current.playbackRate = speed)
                    setSettingsMenu(null)
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded transition-colors flex items-center justify-between",
                    playbackSpeed === speed && "text-blue-400 bg-gray-800/50",
                  )}
                >
                  <span>{speed === 1 ? "Normal" : `${speed}x`}</span>
                  {playbackSpeed === speed && <CheckIcon className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QUALITY MENU */}
        {settingsMenu === "quality" && availableQualities.length > 1 && (
          <div className="flex flex-col overflow-hidden flex-1">
            <button
              onClick={() => setSettingsMenu("main")}
              className="px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 border-b border-gray-700 flex-shrink-0 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="font-medium">Quality</span>
            </button>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              <button
                onClick={() => {
                  setCurrentQuality(-1)
                  setSettingsMenu(null)
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded transition-colors flex items-center justify-between",
                  currentQuality === -1 && "text-blue-400 bg-gray-800/50",
                )}
              >
                <span>Auto</span>
                {currentQuality === -1 && <CheckIcon className="w-4 h-4" />}
              </button>
              {availableQualities.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentQuality(q.id)
                    switchQuality(q.id)
                    setSettingsMenu(null)
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-800 rounded transition-colors flex items-center justify-between",
                    currentQuality === q.id && "text-blue-400 bg-gray-800/50",
                  )}
                >
                  <span>{q.height}p</span>
                  {currentQuality === q.id && <CheckIcon className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIDEO SETTINGS MENU */}
        {settingsMenu === "video" && (
          <div className="flex flex-col overflow-hidden flex-1">
            <button
              onClick={() => setSettingsMenu("main")}
              className="px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 border-b border-gray-700 flex-shrink-0 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="font-medium">Video Settings</span>
            </button>
            <div className="overflow-y-auto flex-1 px-3 py-2 space-y-3">
              {/* Aspect Ratio */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Aspect Ratio</span>
                <div className="grid grid-cols-2 gap-1">
                  {["auto", "16:9", "4:3", "1:1"].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded capitalize",
                        aspectRatio === ratio && "bg-blue-500/50",
                      )}
                    >
                      {ratio === "auto" ? "Auto" : ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Rotation</span>
                <div className="grid grid-cols-2 gap-1">
                  {[0, 90, 180, 270].map((angle) => (
                    <button
                      key={angle}
                      onClick={() => setVideoSettings({ ...videoSettings, rotate: angle })}
                      className={cn(
                        "py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded",
                        videoSettings.rotate === angle && "bg-blue-500/50",
                      )}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Flip */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Flip</span>
                <button
                  onClick={() => setVideoSettings({ ...videoSettings, flip: !videoSettings.flip })}
                  className={cn(
                    "w-full py-2 text-xs bg-gray-800 hover:bg-gray-700 rounded",
                    videoSettings.flip && "bg-blue-500/50",
                  )}
                >
                  {videoSettings.flip ? "Flipped" : "Normal"}
                </button>
              </div>

              {/* Brightness */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Brightness</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={videoSettings.brightness}
                  onChange={(e) => setVideoSettings({ ...videoSettings, brightness: Number(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-full cursor-pointer accent-blue-500"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Contrast</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={videoSettings.contrast}
                  onChange={(e) => setVideoSettings({ ...videoSettings, contrast: Number(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-full cursor-pointer accent-blue-500"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold">Saturation</span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={videoSettings.saturation}
                  onChange={(e) => setVideoSettings({ ...videoSettings, saturation: Number(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-full cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Apply video transformations
  const videoTransformStyle = {
    transform: `rotate(${videoSettings.rotate}deg) scaleX(${videoSettings.flip ? -1 : 1})`,
    filter: `brightness(${videoSettings.brightness}%) contrast(${videoSettings.contrast}%) saturate(${videoSettings.saturation}%)`,
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group bg-black overflow-hidden transition-all duration-700",
        isFullscreen ? "fixed inset-0 z-50 w-screen h-screen" : "w-full h-full",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onContextMenu={handleContextMenu}
    >
      <video
        ref={videoRef}
        poster={poster} // Use internal poster state
        className={cn(
          "w-full h-full transition-transform duration-500",
          aspectRatio === "stretch" ? "object-fill" : "object-contain",
          isFlipped && "-scale-x-100",
          aspectRatio === "4:3" && "scale-y-[1.33] scale-x-[0.75]",
        )}
        style={videoTransformStyle} // Apply video transformations
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
      />

      {actionToast && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md text-white p-6 rounded-full flex flex-col items-center justify-center animate-out fade-out zoom-out duration-500 fill-mode-forwards scale-75">
            {actionToast.icon}
            {actionToast.text && <span className="mt-2 text-sm font-bold">{actionToast.text}</span>}
          </div>
        </div>
      )}

      {/* Adjusted loading overlay z-index and interaction */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-none">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin pointer-events-auto" />
        </div>
      )}

      {showShortcuts && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-8 overflow-y-auto">
          <div className="max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <KeyboardIcon className="w-6 h-6" />
                Keyboard Shortcuts
              </h2>
              <button onClick={() => setShowShortcuts(false)} className="text-white/60 hover:text-white text-2xl">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-white/80">
              <div className="flex justify-between items-center">
                <span>Play/Pause</span> <Kbd>Space</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Mute</span> <Kbd>M</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Fullscreen</span> <Kbd>F</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>PiP</span> <Kbd>P</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Seek Forward</span> <Kbd>→</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Seek Backward</span> <Kbd>←</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Jump 10s</span> <Kbd>L</Kbd> / <Kbd>J</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Speed Up</span> <Kbd>Shift+&gt;</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Slow Down</span> <Kbd>Shift+&lt;</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Normal Speed</span> <Kbd>N</Kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Screenshot</span> <Kbd>S</Kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 text-[10px] text-white/80 font-mono w-48 pointer-events-none">
          <div className="flex justify-between mb-2">
            <span className="text-white font-bold uppercase">Stats for Nerds</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowStats(false)
              }}
              className="pointer-events-auto hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Speed:</span> <span>{networkStats.speed}</span>
            </div>
            <div className="flex justify-between">
              <span>Ping:</span> <span>{networkStats.ping}</span>
            </div>
            <div className="flex justify-between">
              <span>Decoded:</span> <span>{networkStats.decodedFrames}</span>
            </div>
            <div className="flex justify-between">
              <span>Dropped:</span> <span className="text-red-400">{networkStats.droppedFrames}</span>
            </div>
          </div>
          <div className="mt-2 h-8 flex items-end gap-0.5">
            {networkStats.history.map((h, i) => (
              <div key={i} className="flex-1 bg-white/40" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg py-1 shadow-2xl min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setShowStats(!showStats)
              closeContextMenu()
            }}
            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-3"
          >
            <ActivityIcon className="w-4 h-4 text-white/60" />
            Stats for nerds
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(src) // Use internal src state
              closeContextMenu()
            }}
            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-3"
          >
            <CopyIcon className="w-4 h-4 text-white/60" />
            Copy video URL
          </button>
          <button
            onClick={() => {
              setShowShortcuts(true)
              closeContextMenu()
            }}
            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center gap-3"
          >
            <KeyboardIcon className="w-4 h-4 text-white/60" />
            Keyboard shortcuts
          </button>
          <div className="h-px bg-white/10 my-1" />
          <a
            href="#"
            target="_blank"
            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 flex items-center justify-between group"
            rel="noreferrer"
          >
            <span className="flex items-center gap-3">
              <InfoIcon className="w-4 h-4 text-white/60" />
              Powered by Auraplay.js
            </span>
            <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      )}

      <div
        className={cn(
          "absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20 transition-opacity duration-300 pointer-events-none",
          showControls ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Added z-index to controls wrapper to ensure it stays above the loading overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 transform z-20",
          showControls ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <div
          className="relative w-full h-1 group/progress mb-4 flex items-center"
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={handleProgressBarMouseLeave}
        >
          {/* CHANGE: move skip button to right side and display custom name from JSON if available */}
          {currentSkipRange && (
            <div className="absolute -top-16 right-4 z-40">
              <button
                onClick={handleSkip}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold rounded-lg transition-all duration-200 hover:bg-white/30 hover:border-white/50 active:scale-95 shadow-lg hover:shadow-xl"
              >
                <span className="text-sm">{currentSkipRange.name || "Skip"}</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {hoverTime !== null && (
            <div
              className="absolute bottom-full mb-2 bg-black/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded border border-white/10 -translate-x-1/2 pointer-events-none z-30"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
            {bufferedRanges.map((range, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-white/30 transition-all duration-300"
                style={{
                  left: `${(range.start / duration) * 100}%`,
                  width: `${((range.end - range.start) / duration) * 100}%`,
                }}
              />
            ))}

            {skipRangesList.map((range, i) => (
              <div
                key={`skip-${i}`}
                className="absolute top-0 bottom-0 bg-yellow-400/60 transition-all duration-300"
                style={{
                  left: `${(range.start / duration) * 100}%`,
                  width: `${((range.end - range.start) / duration) * 100}%`,
                }}
              />
            ))}

            <div
              className="absolute top-0 bottom-0 left-0 bg-white transition-all duration-100 z-10"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>

            {hoverTime !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full pointer-events-none z-10"
                style={{ left: `${hoverPosition}%`, transform: "translate(-50%, -50%)" }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="hover:scale-120 hover:text-white transition-all focus:outline-none active:scale-95 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            >
              {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="focus:outline-none hover:scale-110 transition-transform hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeMutedIcon className="w-6 h-6 text-white/60" />
                ) : volume < 0.5 ? (
                  <VolumeLowIcon className="w-6 h-6" />
                ) : (
                  <VolumeHighIcon className="w-6 h-6" />
                )}
              </button>
              <div className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 overflow-hidden">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  style={{
                    background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                  }}
                />
              </div>
            </div>

            <span className="text-sm font-medium tabular-nums text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4 relative">
            {textTracks.length > 0 && (
              <button
                onClick={toggleCaptions}
                className={cn(
                  "focus:outline-none transition-all hover:scale-110",
                  captionsEnabled ? "text-white" : "text-white/40 hover:text-white/70",
                )}
              >
                <SubtitlesIcon className="w-6 h-6" />
              </button>
            )}
            {currentSkipRange && ( // Remove skip button from controls as it's now a popup above progress bar
              <button onClick={handleSkip} className="hidden">
                <span className="text-sm">Skip</span>
              </button>
            )}
            <button
              onClick={togglePip}
              className="hover:scale-110 transition-all focus:outline-none hover:text-white text-white/80"
            >
              <PipIcon className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                setShowSettings(!showSettings)
                setSettingsMenu("main") // Reset to main menu
              }}
              className={cn(
                "hover:rotate-45 hover:scale-110 transition-all focus:outline-none text-white/80 hover:text-white",
                showSettings && "text-white rotate-90",
              )}
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="hover:scale-110 transition-all focus:outline-none text-white/80 hover:text-white"
            >
              {isFullscreen ? <FullscreenExitIcon className="w-6 h-6" /> : <FullscreenIcon className="w-6 h-6" />}
            </button>
            {showSettings && renderSettingsMenu()} {/* Render the settings menu */}
          </div>
        </div>
      </div>
    </div>
  )
}
