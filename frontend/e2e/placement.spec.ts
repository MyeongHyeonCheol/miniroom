import { expect, test } from '@playwright/test'
import { coveredCells, GRID, insideRoom, rotatedSize, toWorld } from '../src/room/placement'

// Pure-logic checks for the "anchor cell + rotation" rule. No browser needed.
test.describe('placement', () => {
  const desk: [number, number] = [3, 2]

  test('90/270 rotation swaps the footprint', () => {
    expect(rotatedSize(desk, 0)).toEqual([3, 2])
    expect(rotatedSize(desk, 90)).toEqual([2, 3])
    expect(rotatedSize(desk, 180)).toEqual([3, 2])
    expect(rotatedSize(desk, 270)).toEqual([2, 3])
  })

  test('rotated 3x2 desk stays on the same anchor cell', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const cells = coveredCells({ x: 2, y: 3, rotation }, desk)
      expect(cells).toContain('2,3') // anchor is always the top-left cell
      expect(cells).toHaveLength(6)
    }
    expect(toWorld({ x: 2, y: 3, rotation: 0 }, desk).position).toEqual([1.75, 0, 2])
    expect(toWorld({ x: 2, y: 3, rotation: 90 }, desk).position).toEqual([1.5, 0, 2.25])
  })

  test('inside room check', () => {
    // desk is 3x2, or 2x3 when turned; the room is GRID x GRID cells
    expect(insideRoom({ x: GRID - 3, y: GRID - 2, rotation: 0 }, desk)).toBe(true)
    expect(insideRoom({ x: GRID - 2, y: GRID - 2, rotation: 0 }, desk)).toBe(false)
    expect(insideRoom({ x: GRID - 2, y: GRID - 3, rotation: 90 }, desk)).toBe(true)
    expect(insideRoom({ x: GRID - 1, y: GRID - 3, rotation: 90 }, desk)).toBe(false)
    expect(insideRoom({ x: -1, y: 0, rotation: 0 }, desk)).toBe(false)
  })
})
