/** Tilde de "listo" que se dibuja al enviar un formulario (decorativa: el texto de al lado lo dice) */
export function DoneMark() {
  return (
    <span className="mp-done-mark" aria-hidden="true">
      <svg viewBox="0 0 52 52" width="52" height="52">
        <circle className="mp-done-ring" pathLength={1} cx="26" cy="26" r="23" fill="none" strokeWidth="2.5" />
        <path className="mp-done-tick" pathLength={1} d="M16 27l7 7 14-15" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
