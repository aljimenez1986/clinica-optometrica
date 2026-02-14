import Image from 'next/image'

export default function OptopadLogo({ className = "h-12" }: { className?: string }) {
  return (
    <div className={className} style={{ position: 'relative', width: 'auto' }}>
      <Image
        src="https://web.ua.es/es/optopad/cabecera.jpg"
        alt="Optopad Logo"
        width={200}
        height={80}
        className="object-contain h-full w-auto"
        style={{ height: '100%', width: 'auto', maxWidth: '200px' }}
        unoptimized
        priority
      />
    </div>
  )
}

