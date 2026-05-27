import { useState, useRef } from 'react'
import { Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { useRestaurant } from '../hooks/useRestaurant'
import { useTables } from '@/modules/waiters/hooks/useTables'

type Tab = 'negocio' | 'mesas'

function svgToCanvas(svg: SVGElement, sz: number): Promise<HTMLCanvasElement> {
  return new Promise(resolve => {
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = sz
    canvas.height = sz
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0); resolve(canvas) }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  })
}

export function QRGenerator() {
  const { restaurant, loading } = useRestaurant()
  const { tables, loading: tablesLoading } = useTables(restaurant?.id)
  const [activeTab, setActiveTab] = useState<Tab>('negocio')
  const [size, setSize] = useState(256)
  const [color, setColor] = useState('#000000')
  const [selectedTable, setSelectedTable] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)
  const tableQrRef = useRef<HTMLDivElement>(null)
  const allQrRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
  const tableUrl = selectedTable ? `${menuUrl}?mesa=${selectedTable}` : ''
  const activeTables = tables.filter(t => t.is_active)
  const clampedSize = Math.min(512, Math.max(128, size))

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    svgToCanvas(svg as SVGElement, clampedSize).then(canvas => {
      const link = document.createElement('a')
      link.download = `menulife-qr-${restaurant.slug}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }

  const downloadTableQR = (tableNum: string, container: HTMLDivElement | null) => {
    const svg = container?.querySelector('svg')
    if (!svg) return
    const labelH = 44
    svgToCanvas(svg as SVGElement, clampedSize).then(qrCanvas => {
      const canvas = document.createElement('canvas')
      canvas.width = clampedSize
      canvas.height = clampedSize + labelH
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(qrCanvas, 0, 0)
      ctx.fillStyle = '#111827'
      ctx.font = `bold ${Math.round(clampedSize * 0.09)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`Mesa ${tableNum}`, clampedSize / 2, clampedSize + labelH - 10)
      const link = document.createElement('a')
      link.download = `menulife-mesa-${tableNum}-${restaurant.slug}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }

  const downloadAllQRs = async () => {
    if (activeTables.length === 0) return
    const cols = Math.min(4, activeTables.length)
    const cellSize = 200
    const labelH = 30
    const pad = 16
    const rows = Math.ceil(activeTables.length / cols)
    const canvas = document.createElement('canvas')
    canvas.width = cols * (cellSize + pad) + pad
    canvas.height = rows * (cellSize + labelH + pad) + pad
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < activeTables.length; i++) {
      const t = activeTables[i]
      const ref = allQrRefs.current[t.id]
      const svg = ref?.querySelector('svg')
      if (!svg) continue
      const qrCanvas = await svgToCanvas(svg as SVGElement, cellSize)
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = pad + col * (cellSize + pad)
      const y = pad + row * (cellSize + labelH + pad)
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Mesa ${t.table_number}`, x + cellSize / 2, y + labelH - 6)
      ctx.drawImage(qrCanvas, x, y + labelH)
    }

    const link = document.createElement('a')
    link.download = `menulife-mesas-${restaurant.slug}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Generador de QR</h2>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {(['negocio', 'mesas'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'negocio' ? 'QR del negocio' : 'QR por mesa'}
          </button>
        ))}
      </div>

      {/* Tab: QR del negocio */}
      {activeTab === 'negocio' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Vista previa</h3>
            <div className="flex flex-col items-center gap-4">
              <div ref={qrRef} className="p-6 bg-white rounded-lg border-2 border-gray-200">
                <QRCodeSVG value={menuUrl} size={clampedSize} fgColor={color} level="H" />
              </div>
              <p className="text-sm text-gray-500 text-center break-all">{menuUrl}</p>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Personalización</h3>
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
      )}

      {/* Tab: QR por mesa */}
      {activeTab === 'mesas' && (
        <div className="space-y-6">
          {tablesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : activeTables.length === 0 ? (
            <Card>
              <p className="text-gray-600 text-center py-8">
                No hay mesas activas. Configuralas en la sección <strong>Mesas</strong>.
              </p>
            </Card>
          ) : (
            <>
              {/* Preview + customization */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Vista previa por mesa</h3>
                  <div className="mb-4">
                    <Select
                      label="Seleccionar mesa"
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      options={[
                        { value: '', label: 'Elegir mesa...' },
                        ...activeTables.map(t => ({ value: t.table_number, label: `Mesa ${t.table_number}` })),
                      ]}
                    />
                  </div>
                  {selectedTable ? (
                    <div className="flex flex-col items-center gap-4">
                      <div ref={tableQrRef} className="p-6 bg-white rounded-lg border-2 border-gray-200">
                        <QRCodeSVG value={tableUrl} size={clampedSize} fgColor={color} level="H" />
                      </div>
                      <p className="text-sm text-gray-500 text-center break-all">{tableUrl}</p>
                      <Button onClick={() => downloadTableQR(selectedTable, tableQrRef.current)} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Mesa {selectedTable}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Seleccioná una mesa para ver su QR
                    </p>
                  )}
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Personalización</h3>
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
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Tip</p>
                      <p className="text-sm text-blue-700">
                        Cada QR lleva a <code className="font-mono">/r/{restaurant.slug}?mesa=N</code> — el cliente confirma el pedido con su mesa preseleccionada.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* All tables grid */}
              <Card>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Todas las mesas ({activeTables.length})
                  </h3>
                  <Button onClick={downloadAllQRs} variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar todas
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {activeTables.map(table => {
                    const url = `${menuUrl}?mesa=${table.table_number}`
                    return (
                      <div
                        key={table.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <p className="text-sm font-semibold text-gray-900">Mesa {table.table_number}</p>
                        <div
                          ref={(el) => { allQrRefs.current[table.id] = el }}
                          className="bg-white rounded-lg p-2"
                        >
                          <QRCodeSVG value={url} size={120} fgColor={color} level="H" />
                        </div>
                        <button
                          onClick={() => downloadTableQR(table.table_number, allQrRefs.current[table.id])}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Descargar
                        </button>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
