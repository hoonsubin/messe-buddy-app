// Phase 1 shell - logic wired in Phase 2+.
import { MdLocationOn } from "react-icons/md";

interface YouAreHereMarkerProps {
  readonly xPercent: number;
  readonly yPercent: number;
}

const YouAreHereMarker = (props: YouAreHereMarkerProps) => (
  <div
    className="you-are-here"
    data-testid="you-are-here-marker"
    // Dynamic: position derived from milestone xPercent/yPercent props
    style={{ left: `${props.xPercent}%`, top: `${props.yPercent}%` }}
    aria-label="Your current location"
    role="img"
  >
    <MdLocationOn size={28} aria-hidden="true" />
  </div>
);

export default YouAreHereMarker;
