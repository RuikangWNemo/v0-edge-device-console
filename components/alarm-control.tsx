"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Siren, Volume2, VolumeX, Play, Square, Zap } from "lucide-react"
import type { EdgeDeviceAPI } from "@/lib/api"
import type { AlarmStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface AlarmControlProps {
  api: EdgeDeviceAPI
  alarmStatus: AlarmStatus | null
  onStatusUpdate: (status: AlarmStatus) => void
}

const voicePresets = [
  { id: "standard-en", label: "Standard Warning (EN)", description: "Please stop illegal dumping immediately" },
  { id: "standard-cn", label: "Standard Warning (CN)", description: "请立即停止非法倾倒垃圾" },
  { id: "funny-en", label: "Funny Warning (EN)", description: "Hey! That's not your personal trash can!" },
  { id: "funny-cn", label: "Funny Warning (CN)", description: "嘿！这里不是你的私人垃圾桶！" },
  { id: "stern-en", label: "Stern Warning (EN)", description: "Illegal dumping detected. Authorities notified." },
  { id: "stern-cn", label: "Stern Warning (CN)", description: "检测到非法倾倒，已通知相关部门" },
]

export function AlarmControl({ api, alarmStatus, onStatusUpdate }: AlarmControlProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pulseDuration, setPulseDuration] = useState(2)
  const [selectedPreset, setSelectedPreset] = useState("standard-en")
  const [lastAction, setLastAction] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAlarmAction = async (action: "activate" | "deactivate" | "trigger", duration?: number) => {
    setIsLoading(true)
    setLastAction(action)

    try {
      const request: any = { action }
      if (action === "trigger" && duration) {
        request.duration_seconds = duration
      }

      const updatedStatus = await api.controlAlarm(request)
      onStatusUpdate(updatedStatus)

      toast({
        title: "Alarm Action Completed",
        description: `Alarm ${action} ${action === "trigger" ? `for ${duration}s` : ""} successfully`,
      })
    } catch (error) {
      console.error("Alarm action failed:", error)
      toast({
        title: "Alarm Action Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setLastAction(null)
    }
  }

  const handleTriggerAlarm = () => {
    handleAlarmAction("trigger", pulseDuration)
  }

  const handleActivateAlarm = () => {
    handleAlarmAction("activate")
  }

  const handleDeactivateAlarm = () => {
    handleAlarmAction("deactivate")
  }

  const handleVoicePresetTrigger = () => {
    // For now, this just triggers the alarm with the selected preset
    // In a real implementation, this might send the preset ID to a different endpoint
    toast({
      title: "Voice Warning Triggered",
      description: `Playing: ${voicePresets.find((p) => p.id === selectedPreset)?.label}`,
    })
    handleTriggerAlarm()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return // Don't trigger when typing in inputs

      switch (event.key.toLowerCase()) {
        case "t":
          event.preventDefault()
          handleTriggerAlarm()
          break
        case "a":
          event.preventDefault()
          if (alarmStatus?.active) {
            handleDeactivateAlarm()
          } else {
            handleActivateAlarm()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [alarmStatus?.active])

  return (
    <div className="p-6 space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alarm System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">System:</span>
              <Badge variant={alarmStatus?.enabled ? "default" : "secondary"}>
                {alarmStatus?.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge
                variant={alarmStatus?.active ? "destructive" : "outline"}
                className={alarmStatus?.active ? "animate-pulse bg-status-active" : ""}
              >
                {alarmStatus?.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {lastAction && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Last Action:</span>
                <Badge variant="outline" className="capitalize">
                  {lastAction}
                </Badge>
              </div>
            )}
          </div>

          {!alarmStatus?.enabled && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <VolumeX className="w-4 h-4" />
                <span>Alarm system is disabled. Check GPIO configuration and hardware connections.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Siren className="w-5 h-5" />
            Manual Alarm Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleTriggerAlarm}
              disabled={!alarmStatus?.enabled || isLoading}
              className="h-16 text-base gap-2"
              variant="default"
            >
              <Zap className="w-5 h-5" />
              {isLoading && lastAction === "trigger" ? "Triggering..." : "Trigger (Pulse)"}
            </Button>

            <Button
              onClick={alarmStatus?.active ? handleDeactivateAlarm : handleActivateAlarm}
              disabled={!alarmStatus?.enabled || isLoading}
              className="h-16 text-base gap-2"
              variant={alarmStatus?.active ? "destructive" : "secondary"}
            >
              {alarmStatus?.active ? (
                <>
                  <Square className="w-5 h-5" />
                  {isLoading && lastAction === "deactivate" ? "Deactivating..." : "Deactivate"}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {isLoading && lastAction === "activate" ? "Activating..." : "Activate (Hold)"}
                </>
              )}
            </Button>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pulse-duration" className="text-sm">
                Pulse Duration
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pulse-duration"
                  type="number"
                  min="1"
                  max="30"
                  value={pulseDuration}
                  onChange={(e) => setPulseDuration(Number.parseInt(e.target.value) || 2)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Keyboard Shortcuts:</span>
              <div className="mt-1 flex gap-4">
                <span>
                  <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs">T</kbd> Trigger
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs">A</kbd>{" "}
                  Activate/Deactivate
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Warnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Voice Warning System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voice-preset">Voice Preset</Label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voicePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleVoicePresetTrigger}
                disabled={!alarmStatus?.enabled || isLoading}
                className="w-full gap-2 bg-transparent"
                variant="outline"
              >
                <Volume2 className="w-4 h-4" />
                Play Warning
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border">
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Preview:</span>
              <p className="mt-1">{voicePresets.find((p) => p.id === selectedPreset)?.description}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              Voice warnings trigger the alarm system with audio playback. The actual audio clip selection is configured
              on the device hardware.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GPIO Status:</span>
              <span>{alarmStatus?.enabled ? "Connected" : "Disconnected"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hardware Type:</span>
              <span>Relay + Siren/Amplifier</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Default Pulse:</span>
              <span>2 seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Duration:</span>
              <span>30 seconds</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
