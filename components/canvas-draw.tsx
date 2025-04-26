"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette, Eraser, Trash2, Undo2 } from "lucide-react"

interface CanvasDrawProps {
  onSave?: (dataUrl: string) => void
  width?: number
  height?: number
  readOnly?: boolean
}

export function CanvasDraw({ onSave, width = 600, height = 400, readOnly = false }: CanvasDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState([5])
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [tool, setTool] = useState<"brush" | "eraser">("brush")

  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = width * 2
    canvas.height = height * 2
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Get context
    const context = canvas.getContext("2d")
    if (!context) return

    // Scale for high DPI displays
    context.scale(2, 2)
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = color
    context.lineWidth = brushSize[0]
    contextRef.current = context

    // Initialize with white background
    context.fillStyle = "white"
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Save initial state
    const initialState = context.getImageData(0, 0, canvas.width, canvas.height)
    setHistory([initialState])
    setHistoryIndex(0)
  }, [width, height])

  useEffect(() => {
    if (!contextRef.current) return
    contextRef.current.strokeStyle = tool === "eraser" ? "white" : color
    contextRef.current.lineWidth = brushSize[0]
  }, [color, brushSize, tool])

  const startDrawing = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return

    const { offsetX, offsetY } =
      nativeEvent instanceof MouseEvent
        ? nativeEvent
        : {
            offsetX:
              (nativeEvent as TouchEvent).touches[0].clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
            offsetY:
              (nativeEvent as TouchEvent).touches[0].clientY - (canvasRef.current?.getBoundingClientRect().top || 0),
          }

    const context = contextRef.current
    if (!context) return

    context.beginPath()
    context.moveTo(offsetX, offsetY)
    setIsDrawing(true)
  }

  const draw = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current || readOnly) return

    const { offsetX, offsetY } =
      nativeEvent instanceof MouseEvent
        ? nativeEvent
        : {
            offsetX:
              (nativeEvent as TouchEvent).touches[0].clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
            offsetY:
              (nativeEvent as TouchEvent).touches[0].clientY - (canvasRef.current?.getBoundingClientRect().top || 0),
          }

    contextRef.current.lineTo(offsetX, offsetY)
    contextRef.current.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || readOnly) return

    contextRef.current.closePath()
    setIsDrawing(false)

    // Save current state to history
    const canvas = canvasRef.current
    const currentState = contextRef.current.getImageData(0, 0, canvas.width, canvas.height)

    // Remove any states after current index
    const newHistory = history.slice(0, historyIndex + 1)
    setHistory([...newHistory, currentState])
    setHistoryIndex(newHistory.length)
  }

  const clearCanvas = () => {
    if (!contextRef.current || !canvasRef.current || readOnly) return

    const canvas = canvasRef.current
    contextRef.current.fillStyle = "white"
    contextRef.current.fillRect(0, 0, canvas.width, canvas.height)

    // Save cleared state
    const clearedState = contextRef.current.getImageData(0, 0, canvas.width, canvas.height)
    setHistory([...history.slice(0, historyIndex + 1), clearedState])
    setHistoryIndex(historyIndex + 1)
  }

  const undo = () => {
    if (!contextRef.current || !canvasRef.current || historyIndex <= 0 || readOnly) return

    const newIndex = historyIndex - 1
    const canvas = canvasRef.current
    contextRef.current.putImageData(history[newIndex], 0, 0)
    setHistoryIndex(newIndex)
  }

  const saveCanvas = () => {
    if (!canvasRef.current || !onSave) return
    const dataUrl = canvasRef.current.toDataURL("image/png")
    onSave(dataUrl)
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (readOnly) return
    e.preventDefault()
    startDrawing(e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (readOnly) return
    e.preventDefault()
    draw(e)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (readOnly) return
    e.preventDefault()
    stopDrawing()
  }

  const colors = [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#00FFFF",
    "#FF00FF",
    "#C0C0C0",
    "#808080",
    "#800000",
    "#808000",
    "#008000",
    "#800080",
    "#008080",
    "#000080",
  ]

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative border border-border rounded-md bg-white touch-none"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`touch-none ${readOnly ? "cursor-default" : "cursor-crosshair"}`}
        />
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 mt-2 w-full max-w-md">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" style={{ backgroundColor: color }}>
                <Palette className="h-4 w-4" />
                <span className="sr-only">Renk seç</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-4 gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    className="w-8 h-8 rounded-md border border-input"
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Renk seç: ${c}`}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1 px-2">
            <Slider value={brushSize} min={1} max={20} step={1} onValueChange={setBrushSize} />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setTool(tool === "brush" ? "eraser" : "brush")}
            className={tool === "eraser" ? "bg-secondary" : ""}
          >
            <Eraser className="h-4 w-4" />
            <span className="sr-only">Silgi</span>
          </Button>

          <Button variant="outline" size="icon" onClick={undo} disabled={historyIndex <= 0}>
            <Undo2 className="h-4 w-4" />
            <span className="sr-only">Geri al</span>
          </Button>

          <Button variant="outline" size="icon" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Temizle</span>
          </Button>

          {onSave && <Button onClick={saveCanvas}>Kaydet</Button>}
        </div>
      )}
    </div>
  )
}
