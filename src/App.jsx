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

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [playheadY, setPlayheadY] = useState(0);
  const audioContextRef = useRef(null);
  const playheadIntervalRef = useRef(null);
  const currentOscillatorsRef = useRef([]);
  const gainNodeRef = useRef(null);
  const activeRegionsRef = useRef(new Set()); // Track which regions are currently playing

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

  // Audio system functions
  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0.5; // Increased volume for louder audio
    }
  };

  // Enhanced audio synthesis functions
  const createADSRGain = (audioContext, attack, decay, sustain, release) => {
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + attack);
    gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);

    return { gainNode, releaseTime: release };
  };

  const createFilter = (audioContext, type, frequency, q) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  };

  const createReverb = (audioContext, decay, preDelay) => {
    const convolver = audioContext.createConvolver();
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * decay;
    const impulse = audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const delay = i - preDelay * sampleRate;
        if (delay < 0) continue;
        channelData[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - delay / length, 2);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  };

  // Map pattern index to different synthesis characteristics
  const getSynthesisParamsFromPattern = (patternIdx) => {
    const patterns = [
      // Pattern 0: Bright, percussive
      {
        waveform: "sawtooth",
        adsr: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
        filter: { type: "highpass", frequency: 800, q: 2 },
        reverb: { decay: 0.3, preDelay: 0.01 },
      },
      // Pattern 1: Warm, pad-like
      {
        waveform: "sine",
        adsr: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 },
        filter: { type: "lowpass", frequency: 2000, q: 1 },
        reverb: { decay: 1.5, preDelay: 0.05 },
      },
      // Pattern 2: Metallic, bell-like
      {
        waveform: "triangle",
        adsr: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.8 },
        filter: { type: "bandpass", frequency: 1500, q: 8 },
        reverb: { decay: 0.8, preDelay: 0.02 },
      },
      // Pattern 3: Bass, sub-like
      {
        waveform: "square",
        adsr: { attack: 0.1, decay: 0.2, sustain: 0.9, release: 0.4 },
        filter: { type: "lowpass", frequency: 400, q: 4 },
        reverb: { decay: 0.2, preDelay: 0.01 },
      },
      // Pattern 4: Airy, wind-like
      {
        waveform: "sine",
        adsr: { attack: 0.3, decay: 0.8, sustain: 0.4, release: 1.2 },
        filter: { type: "highpass", frequency: 300, q: 1 },
        reverb: { decay: 2.0, preDelay: 0.1 },
      },
      // Pattern 5: Sharp, pluck-like
      {
        waveform: "sawtooth",
        adsr: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.3 },
        filter: { type: "lowpass", frequency: 3000, q: 2 },
        reverb: { decay: 0.4, preDelay: 0.01 },
      },
      // Pattern 6: Mellow, string-like
      {
        waveform: "triangle",
        adsr: { attack: 0.2, decay: 0.4, sustain: 0.7, release: 0.6 },
        filter: { type: "lowpass", frequency: 1200, q: 3 },
        reverb: { decay: 1.2, preDelay: 0.03 },
      },
      // Pattern 7: Bright, lead-like
      {
        waveform: "sawtooth",
        adsr: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.4 },
        filter: { type: "highpass", frequency: 500, q: 1.5 },
        reverb: { decay: 0.6, preDelay: 0.02 },
      },
      // Pattern 8: Deep, drone-like
      {
        waveform: "sine",
        adsr: { attack: 1.0, decay: 0.5, sustain: 1.0, release: 2.0 },
        filter: { type: "lowpass", frequency: 800, q: 2 },
        reverb: { decay: 3.0, preDelay: 0.05 },
      },
      // Pattern 9: Crisp, digital-like
      {
        waveform: "square",
        adsr: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.1 },
        filter: { type: "bandpass", frequency: 2000, q: 6 },
        reverb: { decay: 0.2, preDelay: 0.005 },
      },
      // Pattern 10: Organic, wood-like
      {
        waveform: "triangle",
        adsr: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 },
        filter: { type: "lowpass", frequency: 600, q: 5 },
        reverb: { decay: 0.9, preDelay: 0.04 },
      },
      // Pattern 11: Ethereal, pad-like
      {
        waveform: "sine",
        adsr: { attack: 0.8, decay: 0.6, sustain: 0.9, release: 1.5 },
        filter: { type: "highpass", frequency: 200, q: 1 },
        reverb: { decay: 2.5, preDelay: 0.08 },
      },
      // Pattern 12: Punchy, drum-like
      {
        waveform: "square",
        adsr: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.15 },
        filter: { type: "bandpass", frequency: 1000, q: 4 },
        reverb: { decay: 0.3, preDelay: 0.01 },
      },
      // Pattern 13: Smooth, vocal-like
      {
        waveform: "sine",
        adsr: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.5 },
        filter: { type: "lowpass", frequency: 1800, q: 2.5 },
        reverb: { decay: 1.0, preDelay: 0.02 },
      },
      // Pattern 14: Harsh, industrial-like
      {
        waveform: "sawtooth",
        adsr: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 },
        filter: { type: "highpass", frequency: 1200, q: 3 },
        reverb: { decay: 0.5, preDelay: 0.01 },
      },
      // Pattern 15: Gentle, ambient-like
      {
        waveform: "triangle",
        adsr: { attack: 0.4, decay: 0.8, sustain: 0.6, release: 1.8 },
        filter: { type: "lowpass", frequency: 900, q: 1.5 },
        reverb: { decay: 2.8, preDelay: 0.06 },
      },
      // Pattern 16: Dynamic, expressive-like
      {
        waveform: "sawtooth",
        adsr: { attack: 0.08, decay: 0.3, sustain: 0.7, release: 0.7 },
        filter: { type: "bandpass", frequency: 800, q: 3 },
        reverb: { decay: 0.9, preDelay: 0.03 },
      },
      // Pattern 17: Mysterious, dark-like
      {
        waveform: "square",
        adsr: { attack: 0.3, decay: 0.6, sustain: 0.5, release: 1.2 },
        filter: { type: "lowpass", frequency: 300, q: 6 },
        reverb: { decay: 1.8, preDelay: 0.07 },
      },
    ];

    return patterns[patternIdx % patterns.length];
  };

  // Musical scale mapping - using only octaves, major thirds, and fifths
  const baseFrequency = 261.63; // C4 as the root note

  // Consonant intervals relative to the root:
  // Octave: 2/1 ratio (2.0)
  // Major third: 5/4 ratio (1.25)
  // Perfect fifth: 3/2 ratio (1.5)
  const consonantIntervals = [
    1.0, // Root (unison)
    1.25, // Major third
    1.5, // Perfect fifth
    2.0, // Octave
  ];

  // Map pattern index to harmonic frequency using only consonant intervals
  const getFrequencyFromPattern = (patternIdx, regionIdx) => {
    // Use pattern index to select a consonant interval
    const intervalIndex = patternIdx % consonantIntervals.length;
    const selectedInterval = consonantIntervals[intervalIndex];

    // Add octave variation based on region index for additional harmony
    const octaveShift = Math.floor(regionIdx / 6) % 3; // 0, 1, or 2 octaves
    const octaveMultiplier = Math.pow(2, octaveShift);

    return baseFrequency * selectedInterval * octaveMultiplier;
  };

  // Map color to consonant harmonic overtones
  const getOvertoneFromColor = (color) => {
    // Convert hex color to hue value
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Simple hue calculation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;

    if (max !== min) {
      const delta = max - min;
      switch (max) {
        case r:
          hue = ((g - b) / delta) % 6;
          break;
        case g:
          hue = (b - r) / delta + 2;
          break;
        case b:
          hue = (r - g) / delta + 4;
          break;
      }
      hue *= 60;
      if (hue < 0) hue += 360;
    }

    // Map hue to consonant intervals only (octaves, major thirds, fifths)
    // Use the same consonant intervals as the main frequency mapping
    const consonantOvertoneIntervals = [
      1.0, // Root (unison)
      1.25, // Major third
      1.5, // Perfect fifth
      2.0, // Octave
    ];

    // Map hue to one of the consonant intervals
    const intervalIndex = Math.floor(
      (hue / 360) * consonantOvertoneIntervals.length
    );
    return consonantOvertoneIntervals[intervalIndex];
  };

  const playToneForRegion = (region, regionIdx) => {
    if (!audioContextRef.current || !isPlayingRef.current) return;

    // Check if this region is already playing
    if (activeRegionsRef.current.has(regionIdx)) return;

    const frequency = getFrequencyFromPattern(region.patternIdx, regionIdx);
    const overtoneRatio = getOvertoneFromColor(region.color);
    const brightness = region.brightness || 0.5;

    // Get synthesis parameters based on pattern
    const synthParams = getSynthesisParamsFromPattern(region.patternIdx);

    // Create oscillator
    const oscillator = audioContextRef.current.createOscillator();

    // Set frequency and waveform type from pattern
    oscillator.frequency.setValueAtTime(
      frequency * overtoneRatio,
      audioContextRef.current.currentTime
    );
    oscillator.type = synthParams.waveform;

    // Create ADSR envelope
    const { gainNode: adsrGain, releaseTime } = createADSRGain(
      audioContextRef.current,
      synthParams.adsr.attack,
      synthParams.adsr.decay,
      synthParams.adsr.sustain,
      synthParams.adsr.release
    );

    // Create filter
    const filter = createFilter(
      audioContextRef.current,
      synthParams.filter.type,
      synthParams.filter.frequency,
      synthParams.filter.q
    );

    // Create reverb
    const reverb = createReverb(
      audioContextRef.current,
      synthParams.reverb.decay,
      synthParams.reverb.preDelay
    );

    // Create reverb send (wet signal)
    const reverbGain = audioContextRef.current.createGain();
    reverbGain.gain.value = 0.3; // 30% reverb

    // Set volume based on region size
    const canvas = canvasRef.current;
    const regionSize = (region.w * region.h) / (canvas.width * canvas.height);
    const baseVolume = regionSize * 0.3;

    // Apply brightness to volume
    const finalVolume = baseVolume * (0.5 + brightness * 0.5);
    adsrGain.gain.setValueAtTime(
      finalVolume,
      audioContextRef.current.currentTime
    );

    // Connect the audio chain: oscillator -> filter -> ADSR -> reverb -> output
    oscillator.connect(filter);
    filter.connect(adsrGain);
    adsrGain.connect(gainNodeRef.current); // Dry signal
    adsrGain.connect(reverbGain); // Wet signal
    reverbGain.connect(reverb);
    reverb.connect(gainNodeRef.current);

    // Start and store reference
    oscillator.start();
    currentOscillatorsRef.current.push({
      oscillator,
      gain: adsrGain,
      filter,
      reverb,
      reverbGain,
      regionIdx,
      releaseTime,
    });

    // Mark this region as active
    activeRegionsRef.current.add(regionIdx);
  };

  const stopToneForRegion = (regionIdx) => {
    if (!audioContextRef.current) return;

    // Find and stop the oscillator for this region
    const oscillatorIndex = currentOscillatorsRef.current.findIndex(
      (item) => item.regionIdx === regionIdx
    );

    if (oscillatorIndex > -1) {
      const { oscillator, gain, releaseTime } =
        currentOscillatorsRef.current[oscillatorIndex];

      try {
        // Implement proper ADSR release
        const now = audioContextRef.current.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

        // Stop the oscillator after release time
        setTimeout(() => {
          try {
            oscillator.stop();
          } catch (e) {
            // Oscillator might already be stopped
          }
        }, releaseTime * 1000);
      } catch (e) {
        // Oscillator might already be stopped
      }

      // Remove from current oscillators
      currentOscillatorsRef.current.splice(oscillatorIndex, 1);
    }

    // Remove from active regions
    activeRegionsRef.current.delete(regionIdx);
  };

  const stopAllOscillators = () => {
    currentOscillatorsRef.current.forEach(
      ({ oscillator, gain, releaseTime }) => {
        try {
          // Implement proper ADSR release
          const now = audioContextRef.current?.currentTime || 0;
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

          // Stop the oscillator after release time
          setTimeout(() => {
            try {
              oscillator.stop();
            } catch (e) {
              // Oscillator might already be stopped
            }
          }, releaseTime * 1000);
        } catch (e) {
          // Oscillator might already be stopped
        }
      }
    );
    currentOscillatorsRef.current = [];
    activeRegionsRef.current.clear();
  };

  // Playhead control functions
  const startPlayback = () => {
    if (!audioContextRef.current) {
      initializeAudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    const canvas = canvasRef.current;
    const playheadSpeed = 2; // pixels per frame at 60fps
    const updateInterval = 16; // ~60fps

    playheadIntervalRef.current = setInterval(() => {
      setPlayheadY((prevY) => {
        const newY = prevY + playheadSpeed;

        // Check for regions intersecting the playhead
        const currentRegions = regionsRef.current;
        const intersectingRegions = currentRegions.filter(
          (region) => newY >= region.y && newY <= region.y + region.h
        );

        // Get indices of intersecting regions
        const intersectingRegionIndices = intersectingRegions.map((region) =>
          currentRegions.indexOf(region)
        );

        // Start playing tones for newly intersecting regions
        intersectingRegionIndices.forEach((regionIdx) => {
          if (!activeRegionsRef.current.has(regionIdx)) {
            playToneForRegion(currentRegions[regionIdx], regionIdx);
          }
        });

        // Stop playing tones for regions that are no longer intersecting
        const currentlyActiveIndices = Array.from(activeRegionsRef.current);
        currentlyActiveIndices.forEach((regionIdx) => {
          if (!intersectingRegionIndices.includes(regionIdx)) {
            stopToneForRegion(regionIdx);
          }
        });

        // Reset playhead when it reaches the bottom
        if (newY >= canvas.height) {
          return 0;
        }
        return newY;
      });
    }, updateInterval);

    isPlayingRef.current = true;
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (playheadIntervalRef.current) {
      clearInterval(playheadIntervalRef.current);
      playheadIntervalRef.current = null;
    }
    stopAllOscillators();
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlayingRef.current) {
      stopPlayback();
    } else {
      startPlayback();
    }
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

    // Draw the main cursor lines (always visible when cursor is active)
    if (isCursorActive) {
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
    }

    // Draw the playhead (horizontal line that scans vertically) with transparency
    if (isPlaying) {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // More transparent white
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, playheadY);
      ctx.lineTo(canvas.width, playheadY);
      ctx.stroke();

      // Add a subtle glowing effect
      ctx.shadowColor = "rgba(255, 255, 255, 0.15)";
      ctx.shadowBlur = 8;
      ctx.stroke();
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
      // Cleanup audio on unmount
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    // Update preview canvas when playhead moves
    if (isPlaying && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext("2d");
      drawPreviewLine(ctx, mousePos.x, mousePos.y);
    }
  }, [playheadY, isPlaying, mousePos.x, mousePos.y]);

  const handleKeyDown = (e) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      togglePlayback();
      return;
    }
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
        <button
          onClick={togglePlayback}
          style={{
            padding: "8px 16px",
            backgroundColor: isPlaying ? "#ff4444" : "#44ff44",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}>
          {isPlaying ? "⏸️ Pause (Space)" : "▶️ Play (Space)"}
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
