import type { HealthStatus, AlarmStatus, InferenceResponse } from "./types"

// Mock health data that changes over time
export function generateMockHealth(): HealthStatus {
  const now = Date.now()
  const isHealthy = Math.sin(now / 10000) > -0.8 // Mostly healthy with occasional degradation

  return {
    status: isHealthy ? "ok" : "degraded",
    camera: {
      available: Math.random() > 0.1, // 90% uptime
      using_mock: true,
      width: 640,
      height: 480,
      fps: 2,
    },
    model: {
      loaded: Math.random() > 0.2, // 80% loaded
      autoload: true,
      path: "/models/yolo11n.pt",
    },
  }
}

// Mock alarm status that changes occasionally
export function generateMockAlarmStatus(): AlarmStatus {
  const now = Date.now()
  const isActive = Math.sin(now / 15000) > 0.7 // Occasionally active

  return {
    active: isActive,
    triggered_at: isActive ? new Date(now - Math.random() * 60000) : null,
    pulse_duration: 5000,
    voice_warning: "en_warning",
  }
}

// Mock inference response
export function generateMockInference(): InferenceResponse {
  const hasDetections = Math.random() > 0.7 // 30% chance of detections
  const detectionCount = hasDetections ? Math.floor(Math.random() * 3) + 1 : 0

  const detections = Array.from({ length: detectionCount }, (_, i) => ({
    label: ["person", "bicycle", "car", "trash_bag"][Math.floor(Math.random() * 4)],
    confidence: 0.5 + Math.random() * 0.5,
    bbox: [Math.random() * 400, Math.random() * 300, 50 + Math.random() * 100, 50 + Math.random() * 100],
  }))

  return {
    detections,
    metadata: {
      inference_ms: 50 + Math.random() * 200,
      model_path: "/models/yolo11n.pt",
      timestamp: new Date().toISOString(),
    },
  }
}
