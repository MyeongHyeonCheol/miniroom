import { expect, test } from '@playwright/test'
import { coveredCells, insideRoom, rotatedSize, toWorld } from '../src/room/placement'

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

  test('inside room check follows the room side', () => {
    // desk is 3x2, or 2x3 when turned
    for (const side of [12, 16, 24] as const) {
      expect(insideRoom({ x: side - 3, y: side - 2, rotation: 0 }, desk, side)).toBe(true)
      expect(insideRoom({ x: side - 2, y: side - 2, rotation: 0 }, desk, side)).toBe(false)
      expect(insideRoom({ x: side - 2, y: side - 3, rotation: 90 }, desk, side)).toBe(true)
      expect(insideRoom({ x: side - 1, y: side - 3, rotation: 90 }, desk, side)).toBe(false)
      expect(insideRoom({ x: -1, y: 0, rotation: 0 }, desk, side)).toBe(false)
    }
    expect(insideRoom({ x: 13, y: 0, rotation: 0 }, desk, 12)).toBe(false)
    expect(insideRoom({ x: 13, y: 0, rotation: 0 }, desk, 16)).toBe(true)
  })
})
