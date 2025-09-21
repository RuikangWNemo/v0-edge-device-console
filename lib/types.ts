export type DeviceConfig = {
  deviceId: string
  deviceLabel: string
  baseUrl?: string
  coords?: { lat: number; lng: number }
}

export type HealthStatus = {
  status: "ok" | "degraded"
  camera: {
    available: boolean
    using_mock: boolean
    width: number
    height: number
    fps: number
  }
  model: {
    loaded: boolean
    path?: string
    autoload?: boolean
  }
}

export type BoundingBox = {
  label: string
  confidence: number
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

export type InferenceRequest = {
  capture_from_camera?: boolean
  image_base64?: string
  return_image?: boolean
}

export type InferenceResponse = {
  detections: BoundingBox[]
  metadata: {
    model_path?: string
    detection_count: number
    inference_ms: number
    note?: string
  }
  encoded_image?: string
}

export type AlarmStatus = {
  enabled: boolean
  active: boolean
}

export type AlarmControlRequest = {
  action?: "activate" | "deactivate" | "trigger"
  duration_seconds?: number
}

export type DetectionEvent = {
  id: string
  timestamp: Date
  detections: BoundingBox[]
  thumbnail?: string
  metadata: InferenceResponse["metadata"]
}

export type SessionStats = {
  avgLatency: number
  p95Latency: number
  detectionsPerMin: number
  totalFrames: number
  latencyHistory: number[]
}
