import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [regions, setRegions] = useState([]);
  const isVerticalRef = useRef(true);
  const [useVerticalSplit, setUseVerticalSplit] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const currentMousePosRef = useRef({ x: 0, y: 0 }); // Track current mouse position
  const [isCursorActive, setIsCursorActive] = useState(true);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const lockedCoordinateRef = useRef(null);

  const earthTones = [
    "#628b8a",
    "#628B7B",
    "#719382",
    "#AFBA8F",
    "#E9D191",
    "#E7B67E",
    "#DF9771",
    "#D48065",
    "#C96656",
    "#B65646",
    "#A24636",
    "#8F3626",
    "#712616",
  ];

  const ditheringPatterns = [
    (i, j) =>
      ((i * 0.5 + 3 * j) * 1) % 2 === 0 && ((j * 0.5 + 3 * i) * 1) % 7 === 0,
    (i, j) => (i * 0.5 + 3 * j) % 2 === 0 && (j * 0.5 + 3 * i) % 7 === 0,
    (i, j) => (i + 3 * j) % 2 === 0 && ((j + 3 * i) / 2) % 4 === 0,
    (i, j) => (Math.floor(i / 8) + Math.floor(j / 4)) % 2 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 2)) % 7 === 1,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 8)) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 8)) % 2 === 0,
    (i, j) => (i + j) % 12 > 6,
    (i, j) => i % 16 < j % 16,
    (i, j) => (i + j) % 6 < 3,
    (i, j) => (i ^ j) % 10 === 0,
    (i, j) => (Math.floor(i / 2) * Math.floor(j / 2)) % 16 === 0,
    (i, j) => i % 4 === 0,
    (i, j) => Math.floor(i / 2) % 4 === 0 && Math.floor(j / 2) % 4 === 0,
    (i, j) => i % 8 === 0 && j % 8 === 0,
    (i, j) => (Math.floor(i / 2) * Math.floor(j / 2)) % 2 === 0,
    (i, j) => (Math.floor(i / 2) * Math.floor(j / 2)) % 2 === 1,
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

  const drawPreviewLine = (ctx, x, y) => {
    const canvas = previewCanvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    // Draw the main line
    ctx.beginPath();
    if (useVerticalSplit) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    } else {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw the square indicator
    const squareSize = 6;
    ctx.fillStyle = "white";
    if (useVerticalSplit) {
      ctx.fillRect(
        x - squareSize / 2,
        y - squareSize / 2,
        squareSize,
        squareSize
      );
    } else {
      ctx.fillRect(
        x - squareSize / 2,
        y - squareSize / 2,
        squareSize,
        squareSize
      );
    }

    ctx.restore();
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
    const previewCanvas = previewCanvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    previewCanvas.width = window.innerWidth;
    previewCanvas.height = window.innerHeight;

    // Initialize mouse position to center of canvas
    const initialX = canvas.width / 2;
    const initialY = canvas.height / 2;
    console.log("Initializing mouse position:", { x: initialX, y: initialY });
    setMousePos({ x: initialX, y: initialY });

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

  const handleKeyDown = (e) => {
    if (e.key === "Shift") {
      // Store the current coordinate based on orientation
      if (isVerticalRef.current) {
        lockedCoordinateRef.current = currentMousePosRef.current.x;
      } else {
        lockedCoordinateRef.current = currentMousePosRef.current.y;
      }
      setIsShiftHeld(true);
    } else if (e.key.toLowerCase() === "a") {
      if (!isCursorActive) {
        setIsCursorActive(true);
      } else {
        isVerticalRef.current = !isVerticalRef.current;
        setUseVerticalSplit(isVerticalRef.current);
      }
    } else if (e.key === "Escape") {
      setIsCursorActive(false);
      // Clear the preview canvas
      const ctx = previewCanvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === "Shift") {
      setIsShiftHeld(false);
      lockedCoordinateRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    if (!isCursorActive) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    // Update the current mouse position ref
    currentMousePosRef.current = { x: newX, y: newY };

    if (isShiftHeld && lockedCoordinateRef.current !== null) {
      // Use the locked coordinate for the primary direction
      if (isVerticalRef.current) {
        setMousePos({
          x: lockedCoordinateRef.current,
          y: newY,
        });
      } else {
        setMousePos({
          x: newX,
          y: lockedCoordinateRef.current,
        });
      }
    } else {
      setMousePos({ x: newX, y: newY });
    }
  };

  useEffect(() => {
    initializeCanvas();
    window.addEventListener("resize", initializeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("resize", initializeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    drawAllRegions();
  }, [regions]);

  // Effect to redraw the preview line when orientation changes
  useEffect(() => {
    if (!isCursorActive) return;

    const ctx = previewCanvasRef.current.getContext("2d");
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    // Draw the main line with current orientation
    ctx.beginPath();
    if (isVerticalRef.current) {
      const x =
        isShiftHeld && lockedCoordinateRef.current !== null
          ? lockedCoordinateRef.current
          : currentMousePosRef.current.x;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    } else {
      const y =
        isShiftHeld && lockedCoordinateRef.current !== null
          ? lockedCoordinateRef.current
          : currentMousePosRef.current.y;
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw the square indicator
    const squareSize = 6;
    ctx.fillStyle = "white";
    if (isShiftHeld && lockedCoordinateRef.current !== null) {
      // When shift is held, keep the square on the line
      if (isVerticalRef.current) {
        ctx.fillRect(
          lockedCoordinateRef.current - squareSize / 2,
          currentMousePosRef.current.y - squareSize / 2,
          squareSize,
          squareSize
        );
      } else {
        ctx.fillRect(
          currentMousePosRef.current.x - squareSize / 2,
          lockedCoordinateRef.current - squareSize / 2,
          squareSize,
          squareSize
        );
      }
    } else {
      // When shift is not held, follow the mouse
      ctx.fillRect(
        currentMousePosRef.current.x - squareSize / 2,
        currentMousePosRef.current.y - squareSize / 2,
        squareSize,
        squareSize
      );
    }

    ctx.restore();
  }, [useVerticalSplit, mousePos.x, mousePos.y, isCursorActive, isShiftHeld]);

  const handleClick = (e) => {
    if (!isCursorActive) {
      setIsCursorActive(true);
      return;
    }

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

        if (isVerticalRef.current) {
          const relX =
            isShiftHeld && lockedCoordinateRef.current !== null
              ? lockedCoordinateRef.current
              : mx;
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
          const relY =
            isShiftHeld && lockedCoordinateRef.current !== null
              ? lockedCoordinateRef.current
              : my;
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
        break;
      }
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{
          display: "block",
          background: "black",
          width: "100vw",
          height: "100vh",
          cursor: isCursorActive ? "none" : "default",
        }}
      />
      <canvas
        ref={previewCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          width: "100vw",
          height: "100vh",
          background: "transparent",
        }}
      />
    </div>
  );
}

export default App;
