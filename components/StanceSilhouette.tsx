// components/StanceSilhouette.tsx
//
// Guided-capture framing silhouette (photo item 2), differing per angle (side
// profile vs front-on). Shared by TwoClipUpload's compact per-slot chip and
// CameraCapture's large translucent overlay on the live camera view — the
// `className` prop controls size/colour/opacity for each use.
export default function StanceSilhouette({
  angle,
  className = 'w-14 h-[74px] flex-shrink-0 text-brand-400',
}: {
  angle: 'side' | 'front'
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 72 96"
      className={className}
      aria-label={`${angle} view framing guide`}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Frame — dashed. Head must sit below the top edge and feet above the
          bottom edge (the "full body in frame" cue). */}
      <rect x="3" y="2" width="66" height="92" rx="7" fill="none"
            stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="12" y1="84" x2="60" y2="84" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      {angle === 'side' ? (
        // Side profile in a bent-over 3-point stance, facing right.
        <g fill="currentColor">
          <circle cx="49" cy="42" r="6" />
          <path d="M22 40 Q34 34 45 46 L43 52 Q33 44 24 48 Z" />
          <path d="M44 48 L52 82 L48 82 L40 50 Z" />
          <path d="M24 46 L20 66 L26 84 L30 82 L25 66 L29 48 Z" />
        </g>
      ) : (
        // Front-on athletic stance: head centred, wide shoulders, feet apart.
        <g fill="currentColor">
          <circle cx="36" cy="30" r="6.5" />
          <path d="M24 40 L48 40 L44 62 L28 62 Z" />
          <path d="M24 41 L19 62 L23 62 L28 44 Z" />
          <path d="M48 41 L53 62 L49 62 L44 44 Z" />
          <path d="M29 61 L24 84 L29 84 L33 62 Z" />
          <path d="M43 61 L48 84 L43 84 L39 62 Z" />
        </g>
      )}
    </svg>
  )
}
