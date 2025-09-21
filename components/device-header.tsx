"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, Camera, Cpu, AlertTriangle, Activity } from "lucide-react"
import type { HealthStatus, AlarmStatus, SessionStats } from "@/lib/types"

interface DeviceHeaderProps {
  deviceConfig: {
    deviceId: string
    deviceLabel: string
  }
  health: HealthStatus | null
  alarmStatus: AlarmStatus | null
  sessionStats: SessionStats
  lastFrameTime: Date | null
}

export function DeviceHeader({ deviceConfig, health, alarmStatus, sessionStats, lastFrameTime }: DeviceHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "status-ok"
      case "degraded":
        return "status-degraded"
      default:
        return "status-down"
    }
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-balance">Illegal Dumping — Edge Device Console</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{deviceConfig.deviceLabel}</span>
              <span className="text-xs">•</span>
              <span className="font-mono">{deviceConfig.deviceId}</span>
              {health && (
                <>
                  <span className="text-xs">•</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full bg-${getStatusColor(health.status)}`} />
                    <span className="capitalize">{health.status}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {lastFrameTime && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{lastFrameTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="border-t border-border bg-muted/30">
        <div className="flex items-center gap-6 px-4 py-2 text-xs">
          {/* Camera Status */}
          <div className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {health?.camera.available ? (
              <span>
                {health.camera.width}×{health.camera.height} @ {health.camera.fps}fps
              </span>
            ) : (
              <span className="text-muted-foreground">Cam unavailable</span>
            )}
          </div>

          {/* Model Status */}
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {health?.model.loaded ? (
              <Badge variant="secondary" className="h-4 px-1 text-xs">
                {health.model.path?.split("/").pop() || "Loaded"}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Model not loaded</span>
            )}
          </div>

          {/* Alarm Status */}
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <div className="flex gap-1">
              {alarmStatus?.enabled && (
                <Badge variant="secondary" className="h-4 px-1 text-xs">
                  Enabled
                </Badge>
              )}
              {alarmStatus?.active && (
                <Badge variant="default" className="h-4 px-1 text-xs bg-status-active">
                  Active
                </Badge>
              )}
            </div>
          </div>

          {/* Performance */}
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{sessionStats.avgLatency.toFixed(0)}ms avg</span>
          </div>

          {/* Detection Rate */}
          <div className="flex items-center gap-1">
            <span>{sessionStats.detectionsPerMin.toFixed(1)}/min</span>
          </div>

          {/* Total Frames */}
          <div className="flex items-center gap-1">
            <span>{sessionStats.totalFrames} frames</span>
          </div>
        </div>
      </div>
    </div>
  )
}
