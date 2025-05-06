import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const [regions, setRegions] = useState([]);
  const [useVerticalSplit, setUseVerticalSplit] = useState(true);

  const earthTones = [
    "#C9987E",
    "#D2B48C",
    "#BC9C7A",
    "#D4A373",
    "#CEB898",
    "#C7A58D",
    "#B6A27C",
    "#D6A07B",
    "#E3BCA2",
    "#CFA68B",
    "#B5BDA3",
    "#A3B18A",
    "#CCD5AE",
    "#BFAFA2",
    "#D8A29D",
  ];

  const ditheringPatterns = [
    (i, j) =>
      ((i * 0.5 + 3 * j) * 1) % 2 === 0 && ((j * 0.5 + 3 * i) * 1) % 7 === 0,
    // (i, j) => (i * 0.5 + 3 * j) % 2 === 0 && (j * 0.5 + 3 * i) % 7 === 0,
    // (i, j) => (i + 3 * j) % 2 === 0 && ((j + 3 * i) / 2) % 4 === 0,
    // (i, j) => (Math.floor(i / 8) + Math.floor(j / 4)) % 2 === 0,
    // (i, j) => (Math.floor(i / 2) + Math.floor(j / 2)) % 7 === 1,
    // (i, j) => (Math.floor(i / 2) + Math.floor(j / 8)) % 3 === 0,
    // (i, j) => (Math.floor(i / 2) + Math.floor(j / 8)) % 2 === 0,
    // (i, j) => (i + j) % 12 > 6,
    // (i, j) => i % 16 < j % 16,
    // (i, j) => (i + j) % 6 < 3,
    // (i, j) => (i ^ j) % 10 === 0,
    // (i, j) => (Math.floor(i / 2) * Math.floor(j / 2)) % 16 === 0,
    // (i, j) => i % 4 === 0,
    // (i, j) => Math.floor(i / 2) % 4 === 0 && Math.floor(j / 2) % 4 === 0,
    // (i, j) => i % 8 === 0 && j % 8 === 0,
    // (i, j) => (Math.floor(i / 2) * Math.floor(j / 2)) % 2 === 0,
    // (i, j) => (Math.floor(i / 2) * Math.floor(j / 2)) % 2 === 1,
  ];

  const getRandomColor = () => {
    return earthTones[Math.floor(Math.random() * earthTones.length)];
  };

  const getRandomPattern = () => {
    return ditheringPatterns[
      Math.floor(Math.random() * ditheringPatterns.length)
    ];
  };

  const drawDitheredRect = (ctx, x, y, w, h, color, patternFn) => {
    // const scale = 4; // Scale factor for pixels
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        if (patternFn(i % 32, j % 32)) {
          ctx.fillStyle = color;
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    }
  };

  const drawAllRegions = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const r of regions) {
      drawDitheredRect(ctx, r.x, r.y, r.w, r.h, r.color, r.pattern);
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const initialColor = getRandomColor();
    const initialPattern = getRandomPattern();
    setRegions([
      {
        x: 0,
        y: 0,
        w: canvas.width,
        h: canvas.height,
        color: initialColor,
        pattern: initialPattern,
      },
    ]);
  };

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const newRegions = [...regions];
    for (let i = 0; i < newRegions.length; i++) {
      const r = newRegions[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        const newColor = getRandomColor();
        const newPattern = getRandomPattern();
        let newRegion1, newRegion2;

        if (useVerticalSplit) {
          const relX = mx;
          newRegion1 = {
            x: r.x,
            y: r.y,
            w: relX - r.x,
            h: r.h,
            color: r.color,
            pattern: r.pattern,
          };
          newRegion2 = {
            x: relX,
            y: r.y,
            w: r.x + r.w - relX,
            h: r.h,
            color: newColor,
            pattern: newPattern,
          };
        } else {
          const relY = my;
          newRegion1 = {
            x: r.x,
            y: r.y,
            w: r.w,
            h: relY - r.y,
            color: r.color,
            pattern: r.pattern,
          };
          newRegion2 = {
            x: r.x,
            y: relY,
            w: r.w,
            h: r.y + r.h - relY,
            color: newColor,
            pattern: newPattern,
          };
        }

        newRegions.splice(i, 1, newRegion1, newRegion2);
        setRegions(newRegions);
        setUseVerticalSplit(!useVerticalSplit);
        break;
      }
    }
  };

  useEffect(() => {
    initializeCanvas();
    window.addEventListener("resize", initializeCanvas);
    return () => window.removeEventListener("resize", initializeCanvas);
  }, []);

  useEffect(() => {
    drawAllRegions();
  }, [regions]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        display: "block",
        background: "black",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}

export default App;
