interface BackgroundImageUploaderProps {
  readonly currentImageUrl: string;
  readonly onUpload: (file: File) => void;
}

const BackgroundImageUploader = (props: BackgroundImageUploaderProps) => (
  <div
    className="card bg-uploader"
    data-testid="bg-image-uploader"
  >
    {props.currentImageUrl && (
      <img
        src={props.currentImageUrl}
        alt="Current background"
        className="bg-uploader__preview"
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
