import { isDirty, useRoomStore } from '../store/roomStore'
import { Button } from '../ui/Button'
import { FurniturePanel } from '../ui/FurniturePanel'
import { Modal } from '../ui/Modal'
import { SurfacePicker } from './SurfacePicker'
import { useEditShortcuts, useUnsavedWarning } from './useEditShortcuts'
import { useSaveLayout } from './useSaveLayout'

/** Unsaved changes and the user wants out: keep editing, or drop the changes. Spec: design.md "모달". */
export function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <Modal title="저장하지 않고 나갈까요?" onClose={onStay}>
      <p className="text-body">바꾼 배치는 저장되지 않고 사라져요.</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onStay}>계속 꾸미기</Button>
        <Button variant="danger" onClick={onLeave}>저장하지 않고 나가기</Button>
      </div>
    </Modal>
  )
}

/**
 * My room in edit mode (docs/screens.md "4. 꾸미기 모드"): floor and wallpaper, the furniture list, save and leave.
 * onLeave asks the page to go back to looking; the page decides whether to confirm first.
 */
export function EditPanel({ slug, onLeave }: { slug: string; onLeave: () => void }) {
  const dirty = useRoomStore(isDirty)
  const { save, saving } = useSaveLayout(slug)
  useEditShortcuts()
  useUnsavedWarning(dirty)
  return (
    <>
      <section className="card panel absolute bottom-6 left-6 flex flex-col gap-4" aria-label="방 꾸미기">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title">방 꾸미기</h2>
          {dirty && <span className="text-caption text-ink-soft">저장 안 됨</span>}
        </div>
        <SurfacePicker />
        <div className="flex justify-end gap-2">
          <Button onClick={onLeave} disabled={saving}>나가기</Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? '저장 중' : '저장'}
          </Button>
        </div>
      </section>
      <FurniturePanel className="absolute right-6 bottom-6" />
    </>
  )
}
