/** @purpose Reusable SVG pointer-drag hook with click/drag disambiguation */
import { useRef, useCallback, useState } from 'react'

interface UseSvgDragOptions {
  onDragStart?: (svgX: number) => void
  onDragMove?: (svgX: number, deltaX: number) => void
  onDragEnd?: (svgX: number) => void
  onClick?: () => void
  threshold?: number // px movement to distinguish click from drag
}

export function useSvgDrag(options: UseSvgDragOptions) {
  const { onDragStart, onDragMove, onDragEnd, onClick, threshold = 3 } = options
  const [isDragging, setIsDragging] = useState(false)
  const startRef = useRef({ x: 0, moved: false })
  const svgRef = useRef<SVGSVGElement | null>(null)

  const getSvgX = useCallback((clientX: number): number => {
    const svg = svgRef.current
    if (!svg) return clientX
    const ctm = svg.getScreenCTM()
    if (!ctm) return clientX
    return (clientX - ctm.e) / ctm.a
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    // Find parent SVG
    svgRef.current = target.closest('svg')

    const svgX = getSvgX(e.clientX)
    startRef.current = { x: svgX, moved: false }
    setIsDragging(true)
    onDragStart?.(svgX)

    const handleMove = (ev: PointerEvent) => {
      const currentX = getSvgX(ev.clientX)
      const delta = currentX - startRef.current.x
      if (Math.abs(delta) > threshold) {
        startRef.current.moved = true
      }
      if (startRef.current.moved) {
        onDragMove?.(currentX, delta)
      }
    }

    const handleUp = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', handleMove)
      target.removeEventListener('pointerup', handleUp)
      target.releasePointerCapture(ev.pointerId)
      setIsDragging(false)

      if (startRef.current.moved) {
        const finalX = getSvgX(ev.clientX)
        onDragEnd?.(finalX)
      } else {
        onClick?.()
      }
    }

    target.addEventListener('pointermove', handleMove)
    target.addEventListener('pointerup', handleUp)
  }, [getSvgX, onDragStart, onDragMove, onDragEnd, onClick, threshold])

  return { handlePointerDown, isDragging }
}
