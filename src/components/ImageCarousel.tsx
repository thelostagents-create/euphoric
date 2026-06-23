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
    <div style={{ position: "relative", marginTop: 10 }}>
      <img
        src={images[at]}
        alt=""
        style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight, display: "block" }}
      />
      {images.length > 1 && (
        <>
          <button className="carousel-nav" style={{ left: 6 }} onClick={(e) => go(e, -1)} aria-label="Previous">‹</button>
          <button className="carousel-nav" style={{ right: 6 }} onClick={(e) => go(e, 1)} aria-label="Next">›</button>
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 5,
            }}
          >
            {images.map((_, j) => (
              <span
                key={j}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: j === at ? "#fff" : "rgba(255,255,255,.45)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
