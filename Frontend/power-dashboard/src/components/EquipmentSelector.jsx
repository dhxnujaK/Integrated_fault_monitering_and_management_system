export default function EquipmentSelector({ equipment = [], selectedEquipmentId, onChange, label = 'Equipment' }) {
  if (!equipment.length) return null

  return (
    <label className="flex items-center gap-2 self-start text-xs font-bold text-[#aeb9d5]">
      <span>{label}</span>
      <select
        value={selectedEquipmentId ?? ''}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className="rounded border border-[#344364] bg-[#101a33] px-2 py-1 text-xs font-bold text-[#f8fbff]"
      >
        {equipment.map((item) => (
          <option key={item.id} value={item.id}>
            {item.displayName || item.equipmentCode}
          </option>
        ))}
      </select>
    </label>
  )
}
