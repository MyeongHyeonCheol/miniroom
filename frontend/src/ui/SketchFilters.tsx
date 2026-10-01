/**
 * SVG filters for the pen-line look. Mounted once; ui.css applies them to ::before/::after layers
 * only, so text never gets displaced. Spec: docs/design.md "볼펜 선".
 */
export function SketchFilters() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="sketch-wobble" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {/* Same noise, weaker: long edges on big cards jitter at scale 5 */}
      <filter id="sketch-wobble-soft" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}
