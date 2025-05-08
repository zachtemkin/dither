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
  const isShiftHeldRef = useRef(false);
  const lockedCoordinateRef = useRef(null);
  const [mode, setMode] = useState("classic"); // default to classic
  const modeRef = useRef(mode);
  const [hoveredRegionIdx, setHoveredRegionIdx] = useState(null);
  const hoveredRegionIdxRef = useRef(null);
  const regionsRef = useRef(regions);
  const [scale, setScale] = useState(2); // For classic mode Bayer scale

  const bayerMatrix = [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
  ];

  const earthTones = [
    "#333473",
    "#453075",
    "#572F76",
    "#6D2E75",
    "#8B2F72",
    "#A02E73",
    "#B02F72",
    "#C02D71",
    "#2A4884",
    "#3C4681",
    "#4E4884",
    "#66497F",
    "#8B4A80",
    "#A24B80",
    "#B34C81",
    "#C74D80",
    "#3978A1",
    "#3D81A4",
    "#5083A2",
    "#6589A3",
    "#8F92A5",
    "#A797A4",
    "#BC9CA9",
    "#628B7B",
    "#719382",
    "#AFBA8F",
    "#E9D191",
    "#E7B67E",
    "#DF9771",
    "#CD7260",
    "#AE5E55",
    "#874D49",
    "#844847",
    "#7F9A89",
    "#8BA38B",
    "#BDC69B",
    "#EDD79B",
    "#EDBF8B",
    "#E3A57C",
    "#D6846F",
    "#BD7465",
    "#9D6459",
    "#98655A",
    "#B8BEA3",
    "#C2C2A8",
    "#DCD9B0",
    "#F4E5AE",
    "#F4D6A4",
    "#EBC499",
    "#E5AC8E",
    "#DAA287",
    "#CA987F",
    "#C4967F",
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

  const getRandomPatternIdx = () => {
    return Math.floor(Math.random() * ditheringPatterns.length);
  };

  const getRandomBrightness = () => {
    return Math.random(); // Returns a value between 0 and 1
  };

  const drawDitheredRect = (ctx, x, y, w, h, color, patternIdx, brightness) => {
    if (mode === "pattern") {
      console.log("Drawing region with patternIdx:", patternIdx);
      const patternFn = ditheringPatterns[patternIdx];
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          if (patternFn(i % 32, j % 32)) {
            ctx.fillStyle = color;
            ctx.fillRect(x + i, y + j, 1, 1);
          }
        }
      }
    } else if (mode === "classic") {
      const matrixSize = 8;
      for (let i = 0; i < w; i += scale) {
        for (let j = 0; j < h; j += scale) {
          const threshold =
            bayerMatrix[Math.floor(j / scale) % matrixSize][
              Math.floor(i / scale) % matrixSize
            ] / 64;
          ctx.fillStyle = brightness > threshold ? "black" : color;
          ctx.fillRect(x + i, y + j, scale, scale);
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
      drawDitheredRect(
        ctx,
        r.x,
        r.y,
        r.w,
        r.h,
        r.color,
        r.patternIdx,
        r.brightness
      );
    }
  };

  const initializeCanvasAndRegions = () => {
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
    const initialPatternIdx = getRandomPatternIdx();
    const initialBrightness = getRandomBrightness();
    setRegions([
      {
        x: 0,
        y: 0,
        w: canvas.width,
        h: canvas.height,
        color: initialColor,
        patternIdx: initialPatternIdx,
        brightness: initialBrightness,
      },
    ]);
  };

  const resizeCanvasOnly = () => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (canvas && previewCanvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      previewCanvas.width = window.innerWidth;
      previewCanvas.height = window.innerHeight;
      drawAllRegions(); // Redraw after resizing
    }
  };

  useEffect(() => {
    initializeCanvasAndRegions();
    window.addEventListener("resize", resizeCanvasOnly);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("resize", resizeCanvasOnly);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    hoveredRegionIdxRef.current = hoveredRegionIdx;
  }, [hoveredRegionIdx]);
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    isShiftHeldRef.current = isShiftHeld;
  }, [isShiftHeld]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const handleKeyDown = (e) => {
    if (e.key === "Shift") {
      isShiftHeldRef.current = true;
      setIsShiftHeld(true);
      if (isVerticalRef.current) {
        lockedCoordinateRef.current = currentMousePosRef.current.x;
      } else {
        lockedCoordinateRef.current = currentMousePosRef.current.y;
      }
      return;
    }
    if (e.key.toLowerCase() === "a") {
      if (!isCursorActive) {
        setIsCursorActive(true);
      } else {
        isVerticalRef.current = !isVerticalRef.current;
        setUseVerticalSplit(isVerticalRef.current);
      }
      return;
    }
    if (e.key === "Escape") {
      setIsCursorActive(false);
      const ctx = previewCanvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }
    // Classic mode: [ and ] to change scale
    if (mode === "classic" && (e.key === "[" || e.key === "]")) {
      if (e.key === "[") {
        setScale((prev) => Math.max(2, prev - 2));
      } else if (e.key === "]") {
        setScale((prev) => Math.min(32, prev + 2));
      }
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
    // Use ref for shift state
    const isolate =
      isShiftHeldRef.current && hoveredRegionIdxRef.current !== null;
    let newRegions = [...regionsRef.current];
    const updateRegion = (region, key) => {
      let updated = { ...region };
      if (key === "ArrowLeft" || key === "ArrowRight") {
        const currentIdx = earthTones.indexOf(region.color);
        let newIdx;
        if (key === "ArrowLeft") {
          newIdx = (currentIdx - 1 + earthTones.length) % earthTones.length;
        } else {
          newIdx = (currentIdx + 1) % earthTones.length;
        }
        updated.color = earthTones[newIdx];
      }
      if (key === "ArrowUp" || key === "ArrowDown") {
        if (modeRef.current === "classic") {
          if (key === "ArrowUp") {
            updated.brightness = Math.min(1, (region.brightness ?? 0) + 0.05);
            console.log("Updating region brightness to:", updated.brightness);
          } else {
            updated.brightness = Math.max(0, (region.brightness ?? 0) - 0.05);
            console.log("Updating region brightness to:", updated.brightness);
          }
        } else if (modeRef.current === "pattern") {
          const currentIdx = region.patternIdx;
          let newPatternIdx = currentIdx;
          if (key === "ArrowUp") {
            newPatternIdx = (currentIdx + 1) % ditheringPatterns.length;
          } else {
            newPatternIdx =
              (currentIdx - 1 + ditheringPatterns.length) %
              ditheringPatterns.length;
          }
          updated.patternIdx = newPatternIdx;
          console.log("Updating region patternIdx to:", newPatternIdx);
        }
      }
      return updated;
    };
    if (isolate) {
      // Only update hovered region
      const idx = hoveredRegionIdxRef.current;
      newRegions[idx] = updateRegion(newRegions[idx], e.key);
    } else {
      // Update all regions
      newRegions = newRegions.map((r) => updateRegion(r, e.key));
    }
    setRegions(newRegions);
  };

  const handleKeyUp = (e) => {
    if (e.key === "Shift") {
      isShiftHeldRef.current = false;
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

    // Find hovered region
    let foundIdx = null;
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      if (
        newX >= r.x &&
        newX <= r.x + r.w &&
        newY >= r.y &&
        newY <= r.y + r.h
      ) {
        foundIdx = i;
        break;
      }
    }
    setHoveredRegionIdx(foundIdx);

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
    drawAllRegions();
  }, [regions, mode, scale]);

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
        const newPatternIdx = getRandomPatternIdx();
        const newBrightness = getRandomBrightness();
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
            patternIdx: r.patternIdx,
            brightness: r.brightness,
          };
          newRegion2 = {
            x: relX,
            y: r.y,
            w: r.x + r.w - relX,
            h: r.h,
            color: newColor,
            patternIdx: newPatternIdx,
            brightness: newBrightness,
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
            patternIdx: r.patternIdx,
            brightness: r.brightness,
          };
          newRegion2 = {
            x: r.x,
            y: relY,
            w: r.w,
            h: r.y + r.h - relY,
            color: newColor,
            patternIdx: newPatternIdx,
            brightness: newBrightness,
          };
        }

        newRegions.splice(i, 1, newRegion1, newRegion2);
        setRegions(newRegions);
        // Toggle orientation after each click
        isVerticalRef.current = !isVerticalRef.current;
        setUseVerticalSplit(isVerticalRef.current);
        break;
      }
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1000,
          display: "flex",
          gap: "10px",
        }}>
        <button
          onClick={() => setMode("classic")}
          style={{
            padding: "8px 16px",
            backgroundColor: mode === "classic" ? "#fff" : "#666",
            color: mode === "classic" ? "black" : "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}>
          Classic Mode
        </button>
        <button
          onClick={() => setMode("pattern")}
          style={{
            padding: "8px 16px",
            backgroundColor: mode === "pattern" ? "#fff" : "#666",
            color: mode === "pattern" ? "black" : "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}>
          Pattern Mode
        </button>
      </div>
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
