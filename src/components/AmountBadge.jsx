export function formatAmount(n) {
  return '₹' + Number(n).toLocaleString('en-IN')
}

export default function AmountBadge({ amount, direction }) {
  const color = direction === 'in' ? 'text-green-700' : direction === 'out' ? 'text-red-700' : 'text-gray-900'
  const prefix = direction === 'in' ? '+' : direction === 'out' ? '-' : ''
  return <span className={`font-semibold ${color}`}>{prefix}{formatAmount(amount)}</span>
}
