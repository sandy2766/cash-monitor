const styles = {
  cash:       'bg-green-50 text-green-700',
  conversion: 'bg-blue-50 text-blue-700',
  expense:    'bg-orange-50 text-orange-700',
}
const labels = { cash: '💵 Cash', conversion: '🔄 Conversion', expense: '💸 Expense' }

export default function TagPill({ tag }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[tag] || 'bg-gray-100 text-gray-500'}`}>
      {labels[tag] || tag}
    </span>
  )
}
