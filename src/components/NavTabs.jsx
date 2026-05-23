export default function NavTabs({ tabs, active, onChange, color = '#111827' }) {
  return (
    <div className="flex border-b border-gray-100 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-shrink-0 px-4 py-2.5 text-sm transition-colors ${
            active === tab.key
              ? 'font-medium border-b-2'
              : 'text-gray-400 border-b-2 border-transparent'
          }`}
          style={active === tab.key ? { borderColor: color, color } : {}}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
