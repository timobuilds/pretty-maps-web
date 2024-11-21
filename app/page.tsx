"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Loader2, Download } from 'lucide-react'

export default function Home() {
  const [address, setAddress] = useState('')
  const [mapType, setMapType] = useState('default')
  const [scale, setScale] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customColors, setCustomColors] = useState({
    building_color: '',
    street_color: '',
    water_color: '',
    park_color: '',
    background_color: ''
  })

  const colorPresets = {
    'Custom': {
      building_color: '',
      street_color: '',
      water_color: '',
      park_color: '',
      background_color: ''
    },
    'Vintage': {
      building_color: '#D4C5B9',
      street_color: '#8B7355',
      water_color: '#B8D0D9',
      park_color: '#A4B494',
      background_color: '#F5E6D3'
    },
    'Ocean': {
      building_color: '#E8E8E8',
      street_color: '#CCCCCC',
      water_color: '#2B65EC',
      park_color: '#98FF98',
      background_color: '#F0F8FF'
    },
    'Desert': {
      building_color: '#DEB887',
      street_color: '#8B7355',
      water_color: '#87CEEB',
      park_color: '#90EE90',
      background_color: '#F4A460'
    },
    'Night': {
      building_color: '#2F4F4F',
      street_color: '#4A4A4A',
      water_color: '#191970',
      park_color: '#006400',
      background_color: '#121212'
    },
    'Pastel': {
      building_color: '#FFB6C1',
      street_color: '#DDA0DD',
      water_color: '#87CEEB',
      park_color: '#98FB98',
      background_color: '#FFF0F5'
    },
    'Forest': {
      building_color: '#8B4513',
      street_color: '#6B4423',
      water_color: '#4682B4',
      park_color: '#228B22',
      background_color: '#F5DEB3'
    }
  }

  const handlePresetChange = (preset: string) => {
    if (preset === 'Custom') {
      setCustomColors({
        building_color: '',
        street_color: '',
        water_color: '',
        park_color: '',
        background_color: ''
      })
    } else {
      setCustomColors(colorPresets[preset])
    }
  }

  const handleColorChange = (colorType: string, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [colorType]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          mapType,
          scale: scale * 1000,
          customColors: Object.fromEntries(
            Object.entries(customColors).filter(([_, value]) => value !== '')
          )
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate map')
      }

      if (data.mapUrl) {
        setMapUrl(data.mapUrl)
      }
    } catch (error) {
      console.error('Error generating map:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate map')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Pretty Maps Generator</h1>
          <p className="mt-3 text-lg text-gray-600">
            Create beautiful, customized maps for any location
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate Map</CardTitle>
            <CardDescription>Enter an address and customize your map settings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter an address"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapType">Map Style</Label>
                <Select value={mapType} onValueChange={setMapType}>
                  <SelectTrigger id="mapType">
                    <SelectValue placeholder="Select a map style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="colorful">Colorful</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Map Colors</Label>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="colorPreset">Color Preset</Label>
                    <Select onValueChange={handlePresetChange} defaultValue="Custom">
                      <SelectTrigger id="colorPreset">
                        <SelectValue placeholder="Select a color preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(colorPresets).map((preset) => (
                          <SelectItem key={preset} value={preset}>
                            {preset}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="building_color">Buildings</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="building_color"
                          value={customColors.building_color || '#000000'}
                          onChange={(e) => handleColorChange('building_color', e.target.value)}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          type="text"
                          value={customColors.building_color}
                          onChange={(e) => handleColorChange('building_color', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="street_color">Streets</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="street_color"
                          value={customColors.street_color || '#000000'}
                          onChange={(e) => handleColorChange('street_color', e.target.value)}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          type="text"
                          value={customColors.street_color}
                          onChange={(e) => handleColorChange('street_color', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="water_color">Water</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="water_color"
                          value={customColors.water_color || '#000000'}
                          onChange={(e) => handleColorChange('water_color', e.target.value)}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          type="text"
                          value={customColors.water_color}
                          onChange={(e) => handleColorChange('water_color', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="park_color">Parks</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="park_color"
                          value={customColors.park_color || '#000000'}
                          onChange={(e) => handleColorChange('park_color', e.target.value)}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          type="text"
                          value={customColors.park_color}
                          onChange={(e) => handleColorChange('park_color', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="background_color">Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="background_color"
                          value={customColors.background_color || '#000000'}
                          onChange={(e) => handleColorChange('background_color', e.target.value)}
                          className="w-12 h-8 p-0"
                        />
                        <Input
                          type="text"
                          value={customColors.background_color}
                          onChange={(e) => handleColorChange('background_color', e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scale">Map Scale</Label>
                <Slider
                  id="scale"
                  defaultValue={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  min={0.05}
                  max={1}
                  step={0.05}
                  className="my-4"
                />
                <div className="text-sm text-gray-500 text-center">
                  {scale * 1000} meters
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Map...
                  </>
                ) : (
                  'Generate Map'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mapUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Your Generated Map</CardTitle>
              <CardDescription>Download or share your custom map</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-square w-full">
                <img
                  src={mapUrl}
                  alt="Generated map"
                  className="rounded-lg shadow-lg object-cover"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <a href={mapUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Map
                </a>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </main>
  )
}
