// Phase 1 shell — logic wired in Phase 2+.
interface BackgroundCanvasProps {
  readonly imageUrl: string;
  readonly alt: string;
  readonly objectFit?: "cover" | "contain" | "fill";
}

const BackgroundCanvas = (props: BackgroundCanvasProps) => (
  <div className="milestone-map__bg-wrapper" data-testid="background-canvas">
    {props.imageUrl ? (
      <img
        className="milestone-map__bg"
        src={props.imageUrl}
        alt={props.alt}
        style={{ objectFit: props.objectFit ?? "cover" }}
        aria-hidden="true"
      />
    ) : (
      <div className="milestone-map__bg milestone-map__bg--placeholder" />
    )}
  </div>
);

export default BackgroundCanvas;
