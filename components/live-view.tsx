"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Square, Camera, ToggleLeft, ToggleRight, Download } from "lucide-react"
import type { EdgeDeviceAPI } from "@/lib/api"
import type { BoundingBox, DetectionEvent, SessionStats } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface LiveViewProps {
  api: EdgeDeviceAPI
  isModelLoaded: boolean
  onDetection: (event: DetectionEvent) => void
  onStatsUpdate: (stats: SessionStats) => void
  onFrameUpdate: (timestamp: Date) => void
}

export function LiveView({ api, isModelLoaded, onDetection, onStatsUpdate, onFrameUpdate }: LiveViewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [fps, setFps] = useState(2)
  const [currentLatency, setCurrentLatency] = useState(0)
  const [detectionCount, setDetectionCount] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const latencyHistoryRef = useRef<number[]>([])
  const detectionHistoryRef = useRef<{ timestamp: number; count: number }[]>([])
  const frameCountRef = useRef(0)
  const { toast } = useToast()

  const drawBoundingBoxes = useCallback(
    (canvas: HTMLCanvasElement, detections: BoundingBox[], imageWidth: number, imageHeight: number) => {
      const ctx = canvas.getContext("2d")
      if (!ctx || !showOverlay) return

      // Clear previous overlays
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Scale factors
      const scaleX = canvas.width / imageWidth
      const scaleY = canvas.height / imageHeight

      detections.forEach((detection) => {
        const x = detection.x_min * scaleX
        const y = detection.y_min * scaleY
        const width = (detection.x_max - detection.x_min) * scaleX
        const height = (detection.y_max - detection.y_min) * scaleY

        // Draw bounding box
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, width, height)

        // Draw label background
        const label = `${detection.label} (${(detection.confidence * 100).toFixed(0)}%)`
        ctx.font = "12px monospace"
        const textMetrics = ctx.measureText(label)
        const textHeight = 16

        ctx.fillStyle = "rgba(59, 130, 246, 0.8)"
        ctx.fillRect(x, y - textHeight - 4, textMetrics.width + 8, textHeight + 4)

        // Draw label text
        ctx.fillStyle = "white"
        ctx.fillText(label, x + 4, y - 6)
      })
    },
    [showOverlay],
  )

  const processFrame = useCallback(
    async (captureFromCamera = true, imageBase64?: string) => {
      if (!isModelLoaded) {
        toast({
          title: "Model Not Loaded",
          description: "Please load the YOLO model first in Settings",
          variant: "destructive",
        })
        return
      }

      setIsProcessing(true)
      const startTime = Date.now()

      try {
        const response = await api.runInference({
          capture_from_camera: captureFromCamera,
          image_base64: imageBase64,
          return_image: true,
        })

        const endTime = Date.now()
        const latency = endTime - startTime
        setCurrentLatency(latency)

        // Update latency history
        latencyHistoryRef.current.push(latency)
        if (latencyHistoryRef.current.length > 60) {
          latencyHistoryRef.current.shift()
        }

        // Update detection count
        setDetectionCount(response.detections.length)

        // Update detection history for rate calculation
        const now = Date.now()
        detectionHistoryRef.current.push({ timestamp: now, count: response.detections.length })
        detectionHistoryRef.current = detectionHistoryRef.current.filter(
          (entry) => now - entry.timestamp < 60000, // Keep last 60 seconds
        )

        // Update frame count
        frameCountRef.current++
        onFrameUpdate(new Date())

        // Calculate stats
        const avgLatency = latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length
        const sortedLatencies = [...latencyHistoryRef.current].sort((a, b) => a - b)
        const p95Index = Math.floor(sortedLatencies.length * 0.95)
        const p95Latency = sortedLatencies[p95Index] || 0

        const detectionsInLastMin = detectionHistoryRef.current.reduce((sum, entry) => sum + entry.count, 0)
        const detectionsPerMin = detectionsInLastMin

        onStatsUpdate({
          avgLatency,
          p95Latency,
          detectionsPerMin,
          totalFrames: frameCountRef.current,
          latencyHistory: [...latencyHistoryRef.current],
        })

        // Draw image and overlays
        if (response.encoded_image && canvasRef.current) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext("2d")
          if (ctx) {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              // Set canvas size to match image aspect ratio
              const maxWidth = 800
              const maxHeight = 600
              const aspectRatio = img.width / img.height

              let canvasWidth = maxWidth
              let canvasHeight = maxWidth / aspectRatio

              if (canvasHeight > maxHeight) {
                canvasHeight = maxHeight
                canvasWidth = maxHeight * aspectRatio
              }

              canvas.width = canvasWidth
              canvas.height = canvasHeight

              // Draw image
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)

              // Draw bounding boxes
              drawBoundingBoxes(canvas, response.detections, img.width, img.height)
            }
            img.src = `data:image/png;base64,${response.encoded_image}`
          }
        }

        // Create detection event
        if (response.detections.length > 0) {
          const event: DetectionEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            detections: response.detections,
            thumbnail: response.encoded_image,
            metadata: response.metadata,
          }
          onDetection(event)
        }
      } catch (error) {
        console.error("Inference failed:", error)
        toast({
          title: "Inference Failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [api, isModelLoaded, drawBoundingBoxes, onDetection, onStatsUpdate, onFrameUpdate, toast],
  )

  const startStream = useCallback(() => {
    if (!isModelLoaded) {
      toast({
        title: "Model Not Loaded",
        description: "Please load the YOLO model first in Settings",
        variant: "destructive",
      })
      return
    }

    setIsStreaming(true)
    const interval = 1000 / fps

    streamIntervalRef.current = setInterval(() => {
      if (!isProcessing) {
        processFrame()
      }
    }, interval)
  }, [fps, isModelLoaded, isProcessing, processFrame, toast])

  const stopStream = useCallback(() => {
    setIsStreaming(false)
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
    }
  }, [])

  const captureFrame = useCallback(() => {
    processFrame()
  }, [processFrame])

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        const base64Data = base64.split(",")[1] // Remove data:image/...;base64, prefix
        setUploadedImage(base64Data)
        processFrame(false, base64Data)
      }
      reader.readAsDataURL(file)
    },
    [processFrame],
  )

  const downloadFrame = useCallback(() => {
    if (!canvasRef.current) return

    const link = document.createElement("a")
    link.download = `frame-${new Date().toISOString()}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current)
      }
    }
  }, [])

  // Update stream interval when FPS changes
  useEffect(() => {
    if (isStreaming) {
      stopStream()
      startStream()
    }
  }, [fps, isStreaming, startStream, stopStream])

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Live Camera Stream
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Stream Controls */}
            <div className="flex items-center gap-2">
              {!isStreaming ? (
                <Button onClick={startStream} disabled={!isModelLoaded} className="gap-2">
                  <Play className="w-4 h-4" />
                  Start Stream
                </Button>
              ) : (
                <Button onClick={stopStream} variant="destructive" className="gap-2">
                  <Square className="w-4 h-4" />
                  Stop Stream
                </Button>
              )}

              <Button
                onClick={captureFrame}
                variant="outline"
                disabled={!isModelLoaded || isProcessing}
                className="gap-2 bg-transparent"
              >
                <Camera className="w-4 h-4" />
                Capture Frame
              </Button>
            </div>

            {/* Overlay Toggle */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowOverlay(!showOverlay)} className="gap-2">
                {showOverlay ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                Overlay
              </Button>
            </div>

            {/* FPS Selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="fps-select" className="text-sm">
                FPS:
              </Label>
              <Select value={fps.toString()} onValueChange={(value) => setFps(Number.parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Download Frame */}
            <Button
              variant="outline"
              size="sm"
              onClick={downloadFrame}
              disabled={!canvasRef.current}
              className="gap-2 bg-transparent"
            >
              <Download className="w-4 h-4" />
              Save Frame
            </Button>
          </div>

          {/* Upload Test Image */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-4">
              <Label htmlFor="image-upload" className="text-sm font-medium">
                Test with uploaded image:
              </Label>
              <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="w-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex items-center gap-4 text-sm">
        <Badge variant={isStreaming ? "default" : "secondary"}>{isStreaming ? "Streaming" : "Stopped"}</Badge>

        {isProcessing && <Badge variant="outline">Processing...</Badge>}

        <div className="flex items-center gap-4 text-muted-foreground">
          <span>Latency: {currentLatency}ms</span>
          <span>Detections: {detectionCount}</span>
          <span>FPS: {fps}</span>
        </div>
      </div>

      {/* Camera Feed */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="relative border border-border rounded-lg overflow-hidden bg-muted/20">
              <canvas ref={canvasRef} className="max-w-full h-auto" style={{ minWidth: "400px", minHeight: "300px" }} />
              {!canvasRef.current?.width && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No camera feed</p>
                    <p className="text-xs">Start streaming or upload an image to test</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!isModelLoaded && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">
                Model not loaded. Please load the YOLO model in Settings to start detection.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
