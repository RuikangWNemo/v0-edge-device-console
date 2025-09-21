"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Camera, Play, Square, Eye, EyeOff, Download, AlertTriangle, Activity, MapPin, Cpu, Clock } from "lucide-react"
import type { EdgeDeviceAPI } from "@/lib/api"
import type { HealthStatus, AlarmStatus, SessionStats, DetectionEvent, DeviceConfig } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface DashboardViewProps {
  api: EdgeDeviceAPI
  health: HealthStatus | null
  alarmStatus: AlarmStatus | null
  sessionStats: SessionStats
  detectionEvents: DetectionEvent[]
  deviceConfig: DeviceConfig
  onDetection: (event: DetectionEvent) => void
  onStatsUpdate: (stats: SessionStats) => void
  onFrameUpdate: (time: Date) => void
  onAlarmStatusUpdate: (status: AlarmStatus) => void
}

export function DashboardView({
  api,
  health,
  alarmStatus,
  sessionStats,
  detectionEvents,
  deviceConfig,
  onDetection,
  onStatsUpdate,
  onFrameUpdate,
  onAlarmStatusUpdate,
}: DashboardViewProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [fps, setFps] = useState(5)
  const [streamUrl, setStreamUrl] = useState("")
  const [selectedAlarm, setSelectedAlarm] = useState("Alarm1")
  const [randomPlay, setRandomPlay] = useState(false)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const { toast } = useToast()

  // Initialize stream URL
  useEffect(() => {
    if (health?.camera.available) {
      setStreamUrl(`${api.baseUrl}/stream?fps=${fps}&overlay=${showOverlay}`)
    }
  }, [api.baseUrl, fps, showOverlay, health?.camera.available])

  const handleStartStream = () => {
    if (!health?.model.loaded) {
      toast({
        title: "Model Not Loaded",
        description: "Please load a YOLO model first",
        variant: "destructive",
      })
      return
    }
    setIsStreaming(true)
    onFrameUpdate(new Date())
  }

  const handleStopStream = () => {
    setIsStreaming(false)
  }

  const handleCaptureFrame = async () => {
    try {
      const response = await fetch(`${api.baseUrl}/capture`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `frame-${new Date().toISOString()}.jpg`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Frame Captured",
        description: "Frame saved to downloads",
      })
    } catch (error) {
      toast({
        title: "Capture Failed",
        description: "Could not capture frame",
        variant: "destructive",
      })
    }
  }

  const handleAlarmAction = async (action: "trigger" | "activate" | "deactivate") => {
    try {
      const response = await api.controlAlarm({
        action,
        alarm_id: selectedAlarm,
        random_play: randomPlay,
      })
      onAlarmStatusUpdate(response)

      toast({
        title: "Alarm Updated",
        description: `Alarm ${action}d successfully`,
      })
    } catch (error) {
      toast({
        title: "Alarm Error",
        description: `Failed to ${action} alarm`,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "text-status-ok"
      case "degraded":
        return "text-status-degraded"
      default:
        return "text-status-down"
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Live Camera Stream - Main Feature */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Live Camera Stream
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={isStreaming ? "destructive" : "default"}
                  onClick={isStreaming ? handleStopStream : handleStartStream}
                  className="gap-2"
                >
                  {isStreaming ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isStreaming ? "Stop" : "Start"}
                </Button>
                <Button variant="outline" onClick={() => setShowOverlay(!showOverlay)} className="gap-2">
                  {showOverlay ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Overlay
                </Button>
                <Select value={fps.toString()} onValueChange={(value) => setFps(Number.parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 FPS</SelectItem>
                    <SelectItem value="5">5 FPS</SelectItem>
                    <SelectItem value="10">10 FPS</SelectItem>
                    <SelectItem value="15">15 FPS</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleCaptureFrame} className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Capture
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
              {isStreaming && streamUrl ? (
                <img
                  src={streamUrl || "/placeholder.svg"}
                  alt="Live camera stream"
                  className="w-full h-full object-cover"
                  onError={() => {
                    toast({
                      title: "Stream Error",
                      description: "Failed to load camera stream",
                      variant: "destructive",
                    })
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Camera stream stopped</p>
                    <p className="text-sm">Click Start to begin streaming</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device KPIs Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Detections</p>
                <p className="text-2xl font-bold">{detectionEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{sessionStats.avgLatency.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Resolution</p>
                <p className="text-lg font-semibold">
                  {health?.camera.available ? `${health.camera.width}×${health.camera.height}` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Model Status</p>
                <Badge variant={health?.model.loaded ? "default" : "secondary"}>
                  {health?.model.loaded ? "Loaded" : "Not Loaded"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Alarm Status</p>
                <Badge variant={alarmStatus?.active ? "destructive" : "secondary"}>
                  {alarmStatus?.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alarm Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alarm Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${alarmStatus?.enabled ? "bg-status-ok" : "bg-muted-foreground"}`}
                  />
                  <span className="text-sm">{alarmStatus?.enabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Alarm Selection</label>
                <Select value={selectedAlarm} onValueChange={setSelectedAlarm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Alarm1", "Alarm2", "Alarm3", "Alarm4", "Alarm5"].map((alarm) => (
                      <SelectItem key={alarm} value={alarm}>
                        {alarm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Random Play</label>
                <Switch checked={randomPlay} onCheckedChange={setRandomPlay} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => handleAlarmAction("trigger")} className="text-xs">
                  Trigger
                </Button>
                <Button variant="default" onClick={() => handleAlarmAction("activate")} className="text-xs">
                  Activate
                </Button>
                <Button variant="destructive" onClick={() => handleAlarmAction("deactivate")} className="text-xs">
                  Deactivate
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Detections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Detections
                </span>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {detectionEvents.slice(0, 5).map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleTimeString()} • {(event.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </motion.div>
                ))}
                {detectionEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No detections yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Device Location */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Device Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deviceConfig.coords ? (
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {deviceConfig.coords.lat.toFixed(6)}, {deviceConfig.coords.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{deviceConfig.deviceLabel}</p>
                  </div>
                  <Button variant="outline" className="w-full gap-2 bg-transparent">
                    <MapPin className="w-4 h-4" />
                    Open Full Map
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Location not configured</p>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                    Set Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
