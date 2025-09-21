"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cpu, Camera, MapPin, AlertTriangle, RefreshCw, TestTube, Download, Upload, Trash2 } from "lucide-react"
import type { EdgeDeviceAPI } from "@/lib/api"
import type { HealthStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface SettingsPanelProps {
  api: EdgeDeviceAPI
  health: HealthStatus | null
  onSettingsUpdate: () => void
}

// Base64 encoded 1x1 gray pixel for testing
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=="

export function SettingsPanel({ api, health, onSettingsUpdate }: SettingsPanelProps) {
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [isTestingInference, setIsTestingInference] = useState(false)
  const [defaultFps, setDefaultFps] = useState(2)
  const [deviceLocation, setDeviceLocation] = useState({ lat: "", lng: "" })
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  // Load settings from localStorage
  useEffect(() => {
    const savedFps = localStorage.getItem("defaultFps")
    if (savedFps) {
      setDefaultFps(Number.parseInt(savedFps) || 2)
    }

    const savedLocation = localStorage.getItem("deviceLocation")
    if (savedLocation) {
      try {
        const { lat, lng } = JSON.parse(savedLocation)
        setDeviceLocation({
          lat: lat.toString(),
          lng: lng.toString(),
        })
      } catch (error) {
        console.error("Failed to load saved location:", error)
      }
    }
  }, [])

  const handleLoadModel = async () => {
    setIsLoadingModel(true)
    try {
      const response = await api.loadModel()
      toast({
        title: response.success ? "Model Loaded" : "Model Load Failed",
        description: response.message,
        variant: response.success ? "default" : "destructive",
      })
      if (response.success) {
        onSettingsUpdate()
      }
    } catch (error) {
      toast({
        title: "Model Load Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoadingModel(false)
    }
  }

  const handleTestInference = async () => {
    setIsTestingInference(true)
    setTestResults(null)

    try {
      const response = await api.runInference({
        capture_from_camera: false,
        image_base64: TEST_IMAGE_BASE64,
        return_image: false,
      })

      setTestResults(response)
      toast({
        title: "Test Completed",
        description: `Inference test successful. Found ${response.detections.length} detections in ${response.metadata.inference_ms.toFixed(1)}ms`,
      })
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsTestingInference(false)
    }
  }

  const handleSaveFps = () => {
    localStorage.setItem("defaultFps", defaultFps.toString())
    toast({
      title: "Settings Saved",
      description: `Default FPS set to ${defaultFps}`,
    })
  }

  const handleSaveLocation = () => {
    const lat = Number.parseFloat(deviceLocation.lat)
    const lng = Number.parseFloat(deviceLocation.lng)

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid Coordinates",
        description: "Please enter valid latitude and longitude values",
        variant: "destructive",
      })
      return
    }

    localStorage.setItem("deviceLocation", JSON.stringify({ lat, lng }))
    toast({
      title: "Location Saved",
      description: `Device location updated to ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    })
  }

  const handleExportSettings = () => {
    const settings = {
      defaultFps,
      deviceLocation: localStorage.getItem("deviceLocation"),
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `edge-device-settings-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Settings Exported",
      description: "Settings file downloaded successfully",
    })
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)

        if (settings.defaultFps) {
          setDefaultFps(settings.defaultFps)
          localStorage.setItem("defaultFps", settings.defaultFps.toString())
        }

        if (settings.deviceLocation) {
          localStorage.setItem("deviceLocation", settings.deviceLocation)
          const { lat, lng } = JSON.parse(settings.deviceLocation)
          setDeviceLocation({
            lat: lat.toString(),
            lng: lng.toString(),
          })
        }

        toast({
          title: "Settings Imported",
          description: "Settings loaded successfully",
        })
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid settings file format",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const handleClearSettings = () => {
    localStorage.removeItem("defaultFps")
    localStorage.removeItem("deviceLocation")
    setDefaultFps(2)
    setDeviceLocation({ lat: "", lng: "" })

    toast({
      title: "Settings Cleared",
      description: "All local settings have been reset",
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Model Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            YOLO Model Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Model Status</div>
              <div className="text-sm text-muted-foreground">
                {health?.model.loaded ? `Loaded: ${health.model.path}` : "No model loaded"}
              </div>
            </div>
            <Badge variant={health?.model.loaded ? "default" : "secondary"}>
              {health?.model.loaded ? "Ready" : "Not Loaded"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-load</div>
              <div className="text-sm text-muted-foreground">Load model automatically on startup</div>
            </div>
            <Badge variant={health?.model.autoload ? "default" : "outline"}>
              {health?.model.autoload ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleLoadModel} disabled={isLoadingModel} className="gap-2">
              {isLoadingModel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              {isLoadingModel ? "Loading..." : "Load/Reload Model"}
            </Button>
          </div>

          {!health?.model.loaded && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Model must be loaded before starting camera inference. Check that YOLO weights are available in the
                models directory.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stream Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Stream Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-fps">Default FPS</Label>
              <Select value={defaultFps.toString()} onValueChange={(value) => setDefaultFps(Number.parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 FPS</SelectItem>
                  <SelectItem value="2">2 FPS</SelectItem>
                  <SelectItem value="4">4 FPS</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Default frame rate for live streaming</div>
            </div>

            <div className="flex items-end">
              <Button onClick={handleSaveFps} variant="outline" className="w-full bg-transparent">
                Save Stream Settings
              </Button>
            </div>
          </div>

          <div className="p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground">
            <div className="font-medium mb-1">Current Camera Status:</div>
            <div>
              Resolution: {health?.camera.width || "Unknown"} × {health?.camera.height || "Unknown"}
            </div>
            <div>Frame Rate: {health?.camera.fps || "Unknown"} FPS</div>
            <div>Mock Mode: {health?.camera.using_mock ? "Enabled" : "Disabled"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settings-lat">Latitude</Label>
              <Input
                id="settings-lat"
                type="number"
                step="any"
                placeholder="31.230416"
                value={deviceLocation.lat}
                onChange={(e) => setDeviceLocation((prev) => ({ ...prev, lat: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-lng">Longitude</Label>
              <Input
                id="settings-lng"
                type="number"
                step="any"
                placeholder="121.473701"
                value={deviceLocation.lng}
                onChange={(e) => setDeviceLocation((prev) => ({ ...prev, lng: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={handleSaveLocation} variant="outline" className="bg-transparent">
            Save Location Settings
          </Button>

          <div className="text-xs text-muted-foreground">
            Location settings are also available in the Location tab with interactive map support.
          </div>
        </CardContent>
      </Card>

      {/* Developer Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Developer Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="font-medium">Test Inference Pipeline</div>
            <div className="text-sm text-muted-foreground">
              Test the inference pipeline with a dummy image to verify model and API functionality
            </div>
            <Button
              onClick={handleTestInference}
              disabled={!health?.model.loaded || isTestingInference}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              {isTestingInference ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              {isTestingInference ? "Testing..." : "Test Inference"}
            </Button>
          </div>

          {testResults && (
            <div className="p-3 bg-muted/20 rounded-lg border border-border">
              <div className="text-sm font-medium mb-2">Test Results:</div>
              <div className="text-xs font-mono space-y-1">
                <div>Detections: {testResults.detections.length}</div>
                <div>Inference Time: {testResults.metadata.inference_ms.toFixed(1)}ms</div>
                <div>Model: {testResults.metadata.model_path || "Unknown"}</div>
                {testResults.metadata.note && <div>Note: {testResults.metadata.note}</div>}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="font-medium">Settings Management</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportSettings} className="gap-1 bg-transparent">
                <Download className="w-3 h-3" />
                Export Settings
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                  <Upload className="w-3 h-3" />
                  Import Settings
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={handleClearSettings} className="gap-1 bg-transparent">
                <Trash2 className="w-3 h-3" />
                Clear All Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Endpoint:</span>
                <span className="font-mono text-xs">{api.baseUrl || window.location.origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health Check:</span>
                <span>Every 5 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Alarm Poll:</span>
                <span>Every 3 seconds</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Request Timeout:</span>
                <span>3 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage:</span>
                <span>Browser LocalStorage</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span>Edge Console v1.0</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
