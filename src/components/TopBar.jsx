export default function TopBar({ title, subtitle, color = 'bg-gray-900', onSignOut, children }) {
  return (
    <div className={`${color} text-white px-4 py-3 flex items-center justify-between`}>
      <div>
        <div className="text-xs opacity-60 font-medium">{subtitle}</div>
        <div className="text-base font-semibold">{title}</div>
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onSignOut && (
          <button onClick={onSignOut} className="text-xs opacity-60 hover:opacity-100 transition-opacity">
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
