"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Camera, Cpu, CheckCircle, XCircle, AlertCircle, TrendingUp, Clock, Zap } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { HealthStatus, SessionStats } from "@/lib/types"

interface HealthDashboardProps {
  health: HealthStatus | null
  sessionStats: SessionStats
  lastUpdated: Date | null
}

export function HealthDashboard({ health, sessionStats, lastUpdated }: HealthDashboardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "bg-green-500"
      case "degraded":
        return "bg-yellow-500"
      default:
        return "bg-red-500"
    }
  }

  // Prepare chart data from latency history
  const chartData = sessionStats.latencyHistory.map((latency, index) => ({
    frame: sessionStats.latencyHistory.length - index,
    latency,
  }))

  const formatUptime = () => {
    if (!lastUpdated) return "Unknown"
    const now = new Date()
    const diff = now.getTime() - lastUpdated.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {health ? getStatusIcon(health.status) : <XCircle className="w-5 h-5 text-gray-500" />}
              </div>
              <div className="text-2xl font-bold capitalize">{health?.status || "Unknown"}</div>
              <div className="text-sm text-muted-foreground">Overall Status</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{formatUptime()}</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{sessionStats.avgLatency.toFixed(0)}ms</div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">{sessionStats.totalFrames}</div>
              <div className="text-sm text-muted-foreground">Total Frames</div>
            </div>
          </div>

          {lastUpdated && (
            <div className="mt-4 pt-4 border-t border-border text-center text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camera Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={health?.camera.available ? "default" : "destructive"}>
                {health?.camera.available ? "Available" : "Unavailable"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mock Mode</span>
              <Badge variant={health?.camera.using_mock ? "secondary" : "outline"}>
                {health?.camera.using_mock ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            {health?.camera && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resolution</span>
                  <span className="text-sm font-mono">
                    {health.camera.width} × {health.camera.height}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Frame Rate</span>
                  <span className="text-sm font-mono">{health.camera.fps} FPS</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Performance</span>
                    <span>{health.camera.available ? "100%" : "0%"}</span>
                  </div>
                  <Progress value={health.camera.available ? 100 : 0} className="h-2" />
                </div>
              </>
            )}

            {!health?.camera.available && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">Camera not ready. Check ribbon cable or permissions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              YOLO Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={health?.model.loaded ? "default" : "destructive"}>
                {health?.model.loaded ? "Loaded" : "Not Loaded"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto-load</span>
              <Badge variant={health?.model.autoload ? "secondary" : "outline"}>
                {health?.model.autoload ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            {health?.model.path && (
              <div className="space-y-1">
                <span className="text-sm font-medium">Model Path</span>
                <div className="p-2 bg-muted/50 rounded border font-mono text-xs break-all">{health.model.path}</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Readiness</span>
                <span>{health?.model.loaded ? "100%" : "0%"}</span>
              </div>
              <Progress value={health?.model.loaded ? 100 : 0} className="h-2" />
            </div>

            {!health?.model.loaded && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">Model not loaded. Use Settings to load the YOLO model.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Session Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{sessionStats.avgLatency.toFixed(1)}ms</div>
                <div className="text-sm text-muted-foreground">Average Latency</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{sessionStats.p95Latency.toFixed(1)}ms</div>
                <div className="text-sm text-muted-foreground">95th Percentile</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{sessionStats.detectionsPerMin.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Detections/min</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{sessionStats.totalFrames}</div>
                <div className="text-sm text-muted-foreground">Total Frames</div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Latency Performance</span>
                  <span>
                    {sessionStats.avgLatency < 200 ? "Excellent" : sessionStats.avgLatency < 500 ? "Good" : "Poor"}
                  </span>
                </div>
                <Progress value={Math.max(0, 100 - sessionStats.avgLatency / 10)} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Detection Rate</span>
                  <span>
                    {sessionStats.detectionsPerMin > 5 ? "High" : sessionStats.detectionsPerMin > 1 ? "Normal" : "Low"}
                  </span>
                </div>
                <Progress value={Math.min(100, (sessionStats.detectionsPerMin / 10) * 100)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Latency Trend (Last 60 Frames)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="frame" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      label={{ value: "ms", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}ms`, "Latency"]}
                    />
                    <Line type="monotone" dataKey="latency" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No performance data</p>
                  <p className="text-xs">Start streaming to see latency trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(health?.status || "down")}`} />
              <div>
                <div className="font-medium">System Status</div>
                <div className="text-sm text-muted-foreground capitalize">{health?.status || "Unknown"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${health?.camera.available ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <div className="font-medium">Camera</div>
                <div className="text-sm text-muted-foreground">
                  {health?.camera.available ? "Connected" : "Disconnected"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${health?.model.loaded ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <div className="font-medium">AI Model</div>
                <div className="text-sm text-muted-foreground">{health?.model.loaded ? "Ready" : "Not Ready"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
