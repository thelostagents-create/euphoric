import { useState } from "react";

/** A swipeable image gallery: one photo at a time with ‹ › buttons + dots. */
export function ImageCarousel({ images, maxHeight = 320 }: { images: string[]; maxHeight?: number }) {
  const [i, setI] = useState(0);
  if (images.length === 0) return null;

  const at = Math.min(i, images.length - 1);
  const go = (e: React.MouseEvent, dir: -1 | 1) => {
    e.stopPropagation();
    e.preventDefault();
    setI((prev) => (prev + dir + images.length) % images.length);
  };

  return (
    <div style={{ marginTop: 10 }}>
      {images.length > 1 && (
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <button className="carousel-nav" onClick={(e) => go(e, -1)} aria-label="Previous">‹</button>
          <div style={{ display: "flex", gap: 5 }}>
            {images.map((_, j) => (
              <span
                key={j}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: j === at ? "var(--accent)" : "var(--border)",
                }}
              />
            ))}
          </div>
          <button className="carousel-nav" onClick={(e) => go(e, 1)} aria-label="Next">›</button>
        </div>
      )}
      <img
        src={images[at]}
        alt=""
        style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight, display: "block" }}
      />
    </div>
  );
}
