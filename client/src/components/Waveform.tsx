import { useEffect, useRef } from "react";

interface WaveformProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  /** Bars glow blue while the agent talks, stay grey otherwise. */
  isSpeaking: boolean;
  active: boolean;
  barCount?: number;
}

const IDLE_HEIGHT = 0.08;

export function Waveform({
  analyserRef,
  isSpeaking,
  active,
  barCount = 44,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelsRef = useRef<number[]>(new Array(barCount).fill(IDLE_HEIGHT));

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    let frame = 0;
    let phase = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();

      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    const observer = new ResizeObserver(resize);

    observer.observe(canvas);

    const draw = () => {
      frame = requestAnimationFrame(draw);
      phase += 0.08;

      const { width, height } = canvas.getBoundingClientRect();

      context.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const levels = levelsRef.current;

      if (active && analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);

        analyser.getByteFrequencyData(data);

        // Sample logarithmically so low frequencies do not dominate.
        for (let i = 0; i < barCount; i++) {
          const start = Math.floor((i / barCount) ** 1.6 * data.length);
          const end = Math.max(
            start + 1,
            Math.floor(((i + 1) / barCount) ** 1.6 * data.length),
          );

          let sum = 0;

          for (let j = start; j < end; j++) sum += data[j];

          const target = Math.min(1, sum / (end - start) / 190);

          levels[i] += (Math.max(IDLE_HEIGHT, target) - levels[i]) * 0.35;
        }
      } else {
        // Idle: a slow shimmer so the control never looks frozen.
        for (let i = 0; i < barCount; i++) {
          const wave =
            IDLE_HEIGHT +
            0.05 * (0.5 + 0.5 * Math.sin(phase + i * 0.45));

          levels[i] += (wave - levels[i]) * 0.12;
        }
      }

      const gap = 2;
      const barWidth = Math.max(
        1.5,
        (width - gap * (barCount - 1)) / barCount,
      );
      const center = height / 2;

      for (let i = 0; i < barCount; i++) {
        const level = levels[i];
        const barHeight = Math.max(3, level * height * 0.92);
        const x = i * (barWidth + gap);
        const y = center - barHeight / 2;

        // Center bars read brighter than the edges.
        const distance = Math.abs(i - (barCount - 1) / 2) / (barCount / 2);
        const alpha = 0.45 + 0.55 * (1 - distance);

        context.fillStyle = isSpeaking
          ? `rgba(37, 99, 235, ${alpha})`
          : `rgba(226, 232, 240, ${alpha * 0.82})`;

        const radius = Math.min(barWidth / 2, barHeight / 2);

        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, radius);
        context.fill();
      }
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active, analyserRef, barCount, isSpeaking]);

  return (
    <canvas
      ref={canvasRef}
      className="h-9 w-full"
      role="presentation"
    />
  );
}
