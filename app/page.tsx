"use client"

import { useState, useEffect } from "react"
import { DeviceHeader } from "@/components/device-header"
import { SidebarNav } from "@/components/sidebar-nav"
import { DashboardView } from "@/components/dashboard-view"
import { HealthDashboard } from "@/components/health-dashboard"
import { DetectionsList } from "@/components/detections-list"
import { SettingsPanel } from "@/components/settings-panel"
import { EdgeDeviceAPI } from "@/lib/api"
import type { DeviceConfig, HealthStatus, AlarmStatus, SessionStats, DetectionEvent } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

// Mock device configuration - in production this would come from props or config
const deviceConfig: DeviceConfig = {
  deviceId: "DKU-TRASH-A01",
  deviceLabel: "DKU Phase I — Riverbank Station A",
  baseUrl: typeof window !== "undefined" ? window.location.origin : "",
  coords: { lat: 31.2304, lng: 121.4737 },
}

export default function EdgeDeviceConsole() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [alarmStatus, setAlarmStatus] = useState<AlarmStatus | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    avgLatency: 0,
    p95Latency: 0,
    detectionsPerMin: 0,
    totalFrames: 0,
    latencyHistory: [],
  })
  const [lastFrameTime, setLastFrameTime] = useState<Date | null>(null)
  const [lastHealthUpdate, setLastHealthUpdate] = useState<Date | null>(null)
  const [detectionEvents, setDetectionEvents] = useState<DetectionEvent[]>([])
  const [currentDeviceConfig, setCurrentDeviceConfig] = useState<DeviceConfig>(deviceConfig)
  const [api] = useState(() => new EdgeDeviceAPI(deviceConfig.baseUrl))
  const { toast } = useToast()

  useEffect(() => {
    const pollHealth = async () => {
      try {
        console.log("[v0] Starting health check with mock API")
        const healthData = await api.getHealth()
        console.log("[v0] Health check successful:", healthData)
        setHealth(healthData)
        setLastHealthUpdate(new Date())
      } catch (error) {
        console.error("Health check failed:", error)
        setHealth((prev) => (prev ? { ...prev, status: "degraded" } : null))
        toast({
          title: "Connection Error",
          description: "Failed to connect to edge device",
          variant: "destructive",
        })
      }
    }

    pollHealth()
    const interval = setInterval(pollHealth, 5000) // 5 seconds
    return () => clearInterval(interval)
  }, [api, toast])

  useEffect(() => {
    const pollAlarm = async () => {
      try {
        console.log("[v0] Starting alarm status check with mock API")
        const alarmData = await api.getAlarmStatus()
        console.log("[v0] Alarm status check successful:", alarmData)
        setAlarmStatus(alarmData)
      } catch (error) {
        console.error("Alarm status check failed:", error)
      }
    }

    pollAlarm()
    const interval = setInterval(pollAlarm, 3000) // 3 seconds
    return () => clearInterval(interval)
  }, [api])

  const handleDetection = (event: DetectionEvent) => {
    setDetectionEvents((prev) => [event, ...prev].slice(0, 50)) // Keep last 50 events
  }

  const handleAlarmStatusUpdate = (status: AlarmStatus) => {
    setAlarmStatus(status)
  }

  const handleLocationUpdate = (coords: { lat: number; lng: number }) => {
    setCurrentDeviceConfig((prev) => ({
      ...prev,
      coords,
    }))
  }

  const handleViewFrame = (event: DetectionEvent) => {
    toast({
      title: "Detection Frame",
      description: `Viewing detection from ${event.timestamp.toLocaleTimeString()}`,
    })
  }

  const handleSettingsUpdate = () => {
    const pollHealth = async () => {
      try {
        const healthData = await api.getHealth()
        setHealth(healthData)
        setLastHealthUpdate(new Date())
      } catch (error) {
        console.error("Health check failed:", error)
      }
    }
    pollHealth()
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView
            api={api}
            health={health}
            alarmStatus={alarmStatus}
            sessionStats={sessionStats}
            detectionEvents={detectionEvents}
            deviceConfig={currentDeviceConfig}
            onDetection={handleDetection}
            onStatsUpdate={setSessionStats}
            onFrameUpdate={setLastFrameTime}
            onAlarmStatusUpdate={handleAlarmStatusUpdate}
          />
        )
      case "health":
        return <HealthDashboard health={health} sessionStats={sessionStats} lastUpdated={lastHealthUpdate} />
      case "detections":
        return <DetectionsList detections={detectionEvents} onViewFrame={handleViewFrame} />
      case "settings":
        return <SettingsPanel api={api} health={health} onSettingsUpdate={handleSettingsUpdate} />
      default:
        return (
          <DashboardView
            api={api}
            health={health}
            alarmStatus={alarmStatus}
            sessionStats={sessionStats}
            detectionEvents={detectionEvents}
            deviceConfig={currentDeviceConfig}
            onDetection={handleDetection}
            onStatsUpdate={setSessionStats}
            onFrameUpdate={setLastFrameTime}
            onAlarmStatusUpdate={handleAlarmStatusUpdate}
          />
        )
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <DeviceHeader
        deviceConfig={currentDeviceConfig}
        health={health}
        alarmStatus={alarmStatus}
        sessionStats={sessionStats}
        lastFrameTime={lastFrameTime}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-auto bg-background">{renderActiveTab()}</main>
      </div>
    </div>
  )
}
