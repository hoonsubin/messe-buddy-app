// Phase 1 shell — upload logic wired in Phase 4.
interface BackgroundImageUploaderProps {
  readonly currentImageUrl: string;
  readonly onUpload: (file: File) => void;
}

const BackgroundImageUploader = (props: BackgroundImageUploaderProps) => (
  <div
    className="card"
    data-testid="bg-image-uploader"
    style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}
  >
    {props.currentImageUrl && (
      <img
        src={props.currentImageUrl}
        alt="Current background"
        style={{ width: "100%", maxHeight: "8rem", objectFit: "cover", borderRadius: "var(--radius)" }}
      />
    )}
    <label className="btn btn--secondary" htmlFor="bg-upload">
      Upload background image
      <input
        id="bg-upload"
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) props.onUpload(file);
        }}
      />
    </label>
  </div>
);

export default BackgroundImageUploader;
