export type SceneLabelLayoutItem = Readonly<{
  id: string
  x: number
  y: number
  width: number
  height: number
  offsetX?: number
  offsetY?: number
}>

export type SceneLabelLayoutOffset = Readonly<{
  id: string
  x: number
  y: number
}>

type Rect = {
  left: number
  top: number
  right: number
  bottom: number
}

const VIEWPORT_MARGIN = 5
const LABEL_GAP = 3
const ROW_STEP = 28
const MIN_COLUMN_STEP = 96

function overlaps(left: Rect, right: Rect): boolean {
  return !(
    left.right + LABEL_GAP <= right.left ||
    right.right + LABEL_GAP <= left.left ||
    left.bottom + LABEL_GAP <= right.top ||
    right.bottom + LABEL_GAP <= left.top
  )
}

function uniqueCandidates(
  item: SceneLabelLayoutItem,
): Array<Readonly<{ x: number; y: number }>> {
  const columnStep = Math.max(MIN_COLUMN_STEP, item.width + LABEL_GAP * 2)
  const preferred = [{ x: 0, y: 0 }]
  if (item.offsetX || item.offsetY) {
    preferred.push({ x: item.offsetX ?? 0, y: item.offsetY ?? 0 })
  }
  const candidates: Array<Readonly<{ x: number; y: number }>> = []
  for (let column = -3; column <= 3; column += 1) {
    for (let row = -8; row <= 8; row += 1) {
      if (column === 0 && row === 0) continue
      candidates.push({ x: column * columnStep, y: row * ROW_STEP })
    }
  }
  candidates.sort(
    (left, right) =>
      Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y),
  )
  const ordered = [...preferred, ...candidates]
  return ordered.filter(
    (candidate, index) =>
      ordered.findIndex(
        (other) => other.x === candidate.x && other.y === candidate.y,
      ) === index,
  )
}

/**
 * Greedily separates compact scene labels while preserving their projected
 * anchor as the first choice. The previous offset is the second choice, which
 * keeps labels stable while the camera is moving through a crowded view.
 */
export function layoutSceneLabels({
  items,
  viewportWidth,
  viewportHeight,
}: {
  items: readonly SceneLabelLayoutItem[]
  viewportWidth: number
  viewportHeight: number
}): SceneLabelLayoutOffset[] {
  const occupied: Rect[] = []
  return items.map((item) => {
    const baseX = item.x - (item.offsetX ?? 0)
    const baseY = item.y - (item.offsetY ?? 0)
    let chosen = { x: 0, y: 0 }
    for (const candidate of uniqueCandidates(item)) {
      const rect = {
        left: baseX + candidate.x,
        top: baseY + candidate.y,
        right: baseX + candidate.x + item.width,
        bottom: baseY + candidate.y + item.height,
      }
      const insideViewport =
        rect.left >= VIEWPORT_MARGIN &&
        rect.top >= VIEWPORT_MARGIN &&
        rect.right <= viewportWidth - VIEWPORT_MARGIN &&
        rect.bottom <= viewportHeight - VIEWPORT_MARGIN
      if (insideViewport && occupied.every((other) => !overlaps(rect, other))) {
        chosen = candidate
        occupied.push(rect)
        return { id: item.id, x: chosen.x, y: chosen.y }
      }
    }
    const fallbackRect = {
      left: baseX,
      top: baseY,
      right: baseX + item.width,
      bottom: baseY + item.height,
    }
    occupied.push(fallbackRect)
    return { id: item.id, x: chosen.x, y: chosen.y }
  })
}
