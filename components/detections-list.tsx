"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { List, Download, Eye, Filter } from "lucide-react"
import type { DetectionEvent } from "@/lib/types"

interface DetectionsListProps {
  detections: DetectionEvent[]
  onViewFrame: (event: DetectionEvent) => void
}

export function DetectionsList({ detections, onViewFrame }: DetectionsListProps) {
  const [filterLabel, setFilterLabel] = useState<string>("all")
  const [minConfidence, setMinConfidence] = useState<number>(0)

  // Get unique labels for filter
  const uniqueLabels = useMemo(() => {
    const labels = new Set<string>()
    detections.forEach((event) => {
      event.detections.forEach((detection) => {
        labels.add(detection.label)
      })
    })
    return Array.from(labels).sort()
  }, [detections])

  // Filter detections
  const filteredDetections = useMemo(() => {
    return detections.filter((event) => {
      const hasMatchingLabel = filterLabel === "all" || event.detections.some((d) => d.label === filterLabel)
      const hasMinConfidence = event.detections.some((d) => d.confidence >= minConfidence / 100)
      return hasMatchingLabel && hasMinConfidence
    })
  }, [detections, filterLabel, minConfidence])

  const exportToCSV = () => {
    const csvData = filteredDetections.map((event) => ({
      timestamp: event.timestamp.toISOString(),
      labels: event.detections.map((d) => d.label).join(";"),
      confidences: event.detections.map((d) => d.confidence.toFixed(3)).join(";"),
      count: event.detections.length,
      latency: event.metadata.inference_ms,
    }))

    const headers = ["timestamp", "labels", "confidences", "count", "latency"]
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => headers.map((header) => row[header as keyof typeof row]).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `detections-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            Detection History
            <Badge variant="secondary" className="ml-auto">
              {filteredDetections.length} events
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Label htmlFor="label-filter" className="text-sm">
                Label:
              </Label>
              <Select value={filterLabel} onValueChange={setFilterLabel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueLabels.map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="confidence-filter" className="text-sm">
                Min Confidence:
              </Label>
              <Input
                id="confidence-filter"
                type="number"
                min="0"
                max="100"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number.parseInt(e.target.value) || 0)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredDetections.length === 0}
              className="gap-2 ml-auto bg-transparent"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Detection Events */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredDetections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <List className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No detections found</p>
                <p className="text-xs">Start streaming to see detection events</p>
              </div>
            ) : (
              filteredDetections.slice(0, 50).map((event) => (
                <Card key={event.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {event.timestamp.toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {event.detections.length} detection{event.detections.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {event.detections.map((detection, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {detection.label} ({(detection.confidence * 100).toFixed(0)}%)
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Latency: {event.metadata.inference_ms.toFixed(1)}ms
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={() => onViewFrame(event)} className="gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
