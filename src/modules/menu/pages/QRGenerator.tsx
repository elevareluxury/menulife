import { useState, useRef } from 'react'
import { Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useRestaurant } from '../hooks/useRestaurant'

export function QRGenerator() {
  const { restaurant, loading } = useRestaurant()
  const [size, setSize] = useState(256)
  const [color, setColor] = useState('#000000')
  const qrRef = useRef<HTMLDivElement>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!restaurant) {
    return <Card><p className="text-gray-600">No se encontró el restaurante</p></Card>
  }

  const menuUrl = `${window.location.origin}/r/${restaurant.slug}`

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    canvas.width = size
    canvas.height = size

    img.onload = () => {
      ctx?.drawImage(img, 0, 0)
      const link = document.createElement('a')
      link.download = `menulife-qr-${restaurant.slug}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const clampedSize = Math.min(512, Math.max(128, size))

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Generador de QR</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Vista previa</h3>
          <div className="flex flex-col items-center gap-4">
            <div ref={qrRef} className="p-6 bg-white rounded-lg border-2 border-gray-200">
              <QRCodeSVG value={menuUrl} size={clampedSize} fgColor={color} level="H" />
            </div>
            <p className="text-sm text-gray-500 text-center break-all">{menuUrl}</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Personalización</h3>
          <div className="space-y-4">
            <Input
              label="Tamaño (px)"
              type="number"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value) || 256)}
              min={128}
              max={512}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <Button onClick={downloadQR} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Descargar QR
            </Button>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Consejo</p>
              <p className="text-sm text-blue-700">
                Imprimí este QR y colocalo en las mesas. Los clientes podrán escanear y ver el menú al instante.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
