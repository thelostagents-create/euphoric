import { useRef } from "react";
import { MAX_UPLOAD, readFileAsDataURL } from "../upload";

/** URL field plus an "Import" button that reads a local image as a data URL. */
export function ImagePicker({
  value,
  onChange,
  placeholder,
  accept = "image/*",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  accept?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD) {
      alert("That file is too large (max 4 MB).");
      return;
    }
    onChange(await readFileAsDataURL(file));
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      <input
        value={value.startsWith("data:") ? "" : value}
        placeholder={value.startsWith("data:") ? "Imported image ✓" : placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="btn ghost sm" disabled={disabled} onClick={() => ref.current?.click()}>
        Import
      </button>
      <input ref={ref} type="file" accept={accept} hidden onChange={pick} />
    </div>
  );
}
