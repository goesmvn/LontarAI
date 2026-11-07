/** Material Symbols icon (font loaded in globals.css). */
export default function Icon({ name, className = "", size }: { name: string; className?: string; size?: number }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}
