"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { MapPin, Copy, Save, RefreshCw, Map, Navigation } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { DeviceConfig } from "@/lib/types"

interface LocationManagerProps {
  deviceConfig: DeviceConfig
  onLocationUpdate: (coords: { lat: number; lng: number }) => void
}

// Static map fallback component
function StaticMapFallback({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="relative w-full h-64 bg-muted/20 border border-border rounded-lg overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" className="w-full h-full">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute w-8 h-0.5 bg-primary -translate-x-4 -translate-y-0.5" />
          <div className="absolute w-0.5 h-8 bg-primary -translate-x-0.5 -translate-y-4" />
          <div className="w-3 h-3 bg-primary rounded-full -translate-x-1.5 -translate-y-1.5" />
        </div>
      </div>

      {/* Coordinates overlay */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>

      {/* Offline indicator */}
      <div className="absolute top-2 right-2 bg-muted/80 backdrop-blur-sm px-2 py-1 rounded text-xs">Static View</div>
    </div>
  )
}

// Interactive map component using Leaflet
function InteractiveMap({
  lat,
  lng,
  onLocationChange,
}: {
  lat: number
  lng: number
  onLocationChange: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let map: any = null
    let marker: any = null

    const initMap = async () => {
      try {
        // Dynamically import Leaflet to avoid SSR issues
        const L = (await import("leaflet")).default

        // Import CSS
        await import("leaflet/dist/leaflet.css")

        if (!mapRef.current) return

        // Create map
        map = L.map(mapRef.current).setView([lat, lng], 15)

        // Add tile layer with error handling
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        })

        tileLayer.on("tileerror", () => {
          setHasError(true)
        })

        tileLayer.addTo(map)

        // Add marker
        marker = L.marker([lat, lng], {
          draggable: true,
        }).addTo(map)

        // Handle marker drag
        marker.on("dragend", (e: any) => {
          const position = e.target.getLatLng()
          onLocationChange(position.lat, position.lng)
        })

        // Handle map click
        map.on("click", (e: any) => {
          const { lat: newLat, lng: newLng } = e.latlng
          marker.setLatLng([newLat, newLng])
          onLocationChange(newLat, newLng)
        })

        setMapInstance(map)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load map:", error)
        setHasError(true)
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [])

  // Update marker position when coordinates change
  useEffect(() => {
    if (mapInstance && mapInstance._layers) {
      Object.values(mapInstance._layers).forEach((layer: any) => {
        if (layer.setLatLng) {
          layer.setLatLng([lat, lng])
        }
      })
      mapInstance.setView([lat, lng])
    }
  }, [lat, lng, mapInstance])

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-muted/20 border border-border rounded-lg flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    )
  }

  if (hasError) {
    return <StaticMapFallback lat={lat} lng={lng} />
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-64 border border-border rounded-lg" />
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
        Interactive Map
      </div>
    </div>
  )
}

export function LocationManager({ deviceConfig, onLocationUpdate }: LocationManagerProps) {
  const [coordinates, setCoordinates] = useState({
    lat: deviceConfig.coords?.lat || 0,
    lng: deviceConfig.coords?.lng || 0,
  })
  const [tempCoordinates, setTempCoordinates] = useState({
    lat: coordinates.lat.toString(),
    lng: coordinates.lng.toString(),
  })
  const [hasCoordinates, setHasCoordinates] = useState(!!deviceConfig.coords)
  const [useInteractiveMap, setUseInteractiveMap] = useState(true)
  const { toast } = useToast()

  const handleCoordinateChange = (field: "lat" | "lng", value: string) => {
    setTempCoordinates((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveCoordinates = () => {
    const lat = Number.parseFloat(tempCoordinates.lat)
    const lng = Number.parseFloat(tempCoordinates.lng)

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid Coordinates",
        description: "Please enter valid latitude and longitude values",
        variant: "destructive",
      })
      return
    }

    if (lat < -90 || lat > 90) {
      toast({
        title: "Invalid Latitude",
        description: "Latitude must be between -90 and 90 degrees",
        variant: "destructive",
      })
      return
    }

    if (lng < -180 || lng > 180) {
      toast({
        title: "Invalid Longitude",
        description: "Longitude must be between -180 and 180 degrees",
        variant: "destructive",
      })
      return
    }

    setCoordinates({ lat, lng })
    setHasCoordinates(true)
    onLocationUpdate({ lat, lng })

    // Save to localStorage
    localStorage.setItem("deviceLocation", JSON.stringify({ lat, lng }))

    toast({
      title: "Location Saved",
      description: `Coordinates updated to ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    })
  }

  const handleMapLocationChange = (lat: number, lng: number) => {
    setCoordinates({ lat, lng })
    setTempCoordinates({
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    })
    onLocationUpdate({ lat, lng })

    // Save to localStorage
    localStorage.setItem("deviceLocation", JSON.stringify({ lat, lng }))

    toast({
      title: "Location Updated",
      description: `Moved to ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    })
  }

  const handleCopyCoordinates = () => {
    const coordString = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
    navigator.clipboard.writeText(coordString)
    toast({
      title: "Coordinates Copied",
      description: `${coordString} copied to clipboard`,
    })
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCoordinates({ lat: latitude, lng: longitude })
        setTempCoordinates({
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        })
        setHasCoordinates(true)
        onLocationUpdate({ lat: latitude, lng: longitude })

        localStorage.setItem("deviceLocation", JSON.stringify({ lat: latitude, lng: longitude }))

        toast({
          title: "Location Detected",
          description: `Updated to current location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        })
      },
      (error) => {
        toast({
          title: "Location Error",
          description: "Failed to get current location. Please enter coordinates manually.",
          variant: "destructive",
        })
      },
    )
  }

  // Load saved coordinates on mount
  useEffect(() => {
    const saved = localStorage.getItem("deviceLocation")
    if (saved) {
      try {
        const { lat, lng } = JSON.parse(saved)
        setCoordinates({ lat, lng })
        setTempCoordinates({
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        })
        setHasCoordinates(true)
      } catch (error) {
        console.error("Failed to load saved location:", error)
      }
    }
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Device Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold">{deviceConfig.deviceLabel}</div>
              <div className="text-sm text-muted-foreground font-mono">{deviceConfig.deviceId}</div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={hasCoordinates ? "default" : "secondary"}>
                {hasCoordinates ? "Location Set" : "Location Unknown"}
              </Badge>
              {hasCoordinates && (
                <Button variant="outline" size="sm" onClick={handleCopyCoordinates} className="gap-1 bg-transparent">
                  <Copy className="w-3 h-3" />
                  Copy Coordinates
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Display */}
      {hasCoordinates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Location Map
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseInteractiveMap(!useInteractiveMap)}
                  className="gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {useInteractiveMap ? "Static View" : "Interactive View"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {useInteractiveMap ? (
              <InteractiveMap lat={coordinates.lat} lng={coordinates.lng} onLocationChange={handleMapLocationChange} />
            ) : (
              <StaticMapFallback lat={coordinates.lat} lng={coordinates.lng} />
            )}

            <div className="mt-4 p-3 bg-muted/20 rounded-lg">
              <div className="text-sm text-muted-foreground">
                <strong>Current Location:</strong> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </div>
              {useInteractiveMap && (
                <div className="text-xs text-muted-foreground mt-1">
                  Click on the map or drag the marker to update location
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Coordinate Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Manual Coordinate Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="31.230416"
                value={tempCoordinates.lat}
                onChange={(e) => handleCoordinateChange("lat", e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Range: -90 to 90</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="121.473701"
                value={tempCoordinates.lng}
                onChange={(e) => handleCoordinateChange("lng", e.target.value)}
              />
              <div className="text-xs text-muted-foreground">Range: -180 to 180</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveCoordinates} className="gap-2">
              <Save className="w-4 h-4" />
              Save Location
            </Button>

            <Button variant="outline" onClick={handleGetCurrentLocation} className="gap-2 bg-transparent">
              <Navigation className="w-4 h-4" />
              Use Current Location
            </Button>
          </div>

          {!hasCoordinates && (
            <div className="p-3 bg-muted/50 border border-border rounded-lg">
              <div className="text-sm text-muted-foreground">
                No location set. Enter coordinates manually or use your current location to enable map display.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Information */}
      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinate System:</span>
              <span>WGS84 (GPS)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precision:</span>
              <span>6 decimal places (~0.1m)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage:</span>
              <span>Local Browser Storage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Map Provider:</span>
              <span>OpenStreetMap</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
