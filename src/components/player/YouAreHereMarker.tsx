// Phase 1 shell — logic wired in Phase 2+.
interface YouAreHereMarkerProps {
  readonly xPercent: number;
  readonly yPercent: number;
}

const YouAreHereMarker = (props: YouAreHereMarkerProps) => (
  <div
    className="you-are-here"
    data-testid="you-are-here-marker"
    style={{ left: `${props.xPercent}%`, top: `${props.yPercent}%` }}
    aria-label="Your current location"
    role="img"
  >
    📍
  </div>
);

export default YouAreHereMarker;
