export default function OptopadLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Círculo exterior del ojo */}
      <circle cx="60" cy="60" r="50" fill="url(#gradient1)" stroke="#1e40af" strokeWidth="2" />
      
      {/* Iris del ojo */}
      <circle cx="60" cy="60" r="30" fill="url(#gradient2)" />
      
      {/* Pupila */}
      <circle cx="60" cy="60" r="15" fill="#0f172a" />
      
      {/* Reflejo en el ojo */}
      <circle cx="50" cy="50" r="8" fill="white" opacity="0.6" />
      
      {/* Gafas - marco superior */}
      <path
        d="M 20 45 Q 30 35 40 40 Q 50 45 60 40 Q 70 45 80 40 Q 90 35 100 45"
        stroke="#1e40af"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Gafas - patillas */}
      <line x1="20" y1="45" x2="10" y2="50" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="45" x2="110" y2="50" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" />
      
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

