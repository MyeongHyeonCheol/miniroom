import { FLOORS, WALLS } from '../room/surfaces'
import { useRoomStore } from '../store/roomStore'
import { SegmentedControl } from '../ui/SegmentedControl'

/** Floor and wallpaper choice. Spec: docs/design.md "탭 SegmentedControl". */
export function SurfacePicker() {
  const floor = useRoomStore((s) => s.floor)
  const wall = useRoomStore((s) => s.wall)
  const setFloor = useRoomStore((s) => s.setFloor)
  const setWall = useRoomStore((s) => s.setWall)
  return (
    <>
      <div>
        <span className="field-label text-small">바닥</span>
        <SegmentedControl label="바닥" options={FLOORS} value={floor} onChange={setFloor} />
      </div>
      <div>
        <span className="field-label text-small">벽지</span>
        <SegmentedControl label="벽지" options={WALLS} value={wall} onChange={setWall} />
      </div>
    </>
  )
}
