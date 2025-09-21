import type { HealthStatus, InferenceRequest, InferenceResponse, AlarmStatus, AlarmControlRequest } from "./types"
import { generateMockHealth, generateMockAlarmStatus, generateMockInference } from "./mock-data"

export class EdgeDeviceAPI {
  private baseUrl: string
  private abortController: AbortController | null = null

  constructor(baseUrl: string = window.location.origin) {
    this.baseUrl = baseUrl
  }

  async getHealth(): Promise<HealthStatus> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))
    return generateMockHealth()
  }

  async loadModel(): Promise<{ success: boolean; message: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

    const success = Math.random() > 0.2 // 80% success rate
    return {
      success,
      message: success
        ? "YOLO model loaded successfully from /models/yolo11n.pt"
        : "Failed to load model: Model file not found",
    }
  }

  async runInference(request: InferenceRequest): Promise<InferenceResponse> {
    // Simulate inference delay
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 200))
    return generateMockInference()
  }

  async getAlarmStatus(): Promise<AlarmStatus> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100))
    return generateMockAlarmStatus()
  }

  async controlAlarm(request: AlarmControlRequest): Promise<AlarmStatus> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300))

    // Return updated alarm status based on the request
    return {
      active: request.action === "trigger" || request.action === "activate",
      triggered_at: request.action === "trigger" ? new Date() : null,
      pulse_duration: request.pulse_duration || 5000,
      voice_warning: request.voice_warning || "en_warning",
    }
  }

  cancelRequests() {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}
