import React, { useEffect, useRef } from 'react';

interface Beam {
    x: number;
    y: number;
    dx: number;
    dy: number;
    speed: number;
    history: { x: number, y: number }[];
    state: 'active' | 'dying';
}

const GridBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorRef = useRef({ x: -2000, y: -2000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let beams: Beam[] = [];
        const GRID_SIZE = 60; // Larger grid for more "calm" space
        const NUM_BEAMS = 22; // Much fewer beams to reduce distraction
        const BEAM_SPEED = 0.8; // Even slower
        const WORM_LENGTH = 120;
        const GLOW_RADIUS = 400; // Large, soft influence area

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initBeams();
        };

        const initBeams = () => {
            beams = [];
            for (let i = 0; i < NUM_BEAMS; i++) {
                beams.push(createBeam());
            }
        };

        const createBeam = (): Beam => {
            const cols = Math.ceil(canvas.width / GRID_SIZE);
            const rows = Math.ceil(canvas.height / GRID_SIZE);

            const x = Math.floor(Math.random() * cols) * GRID_SIZE;
            const y = Math.floor(Math.random() * rows) * GRID_SIZE;

            const dir = Math.floor(Math.random() * 4);
            let dx = 0, dy = 0;
            if (dir === 0) dx = 1;
            else if (dir === 1) dx = -1;
            else if (dir === 2) dy = 1;
            else if (dir === 3) dy = -1;

            return {
                x, y, dx, dy,
                speed: BEAM_SPEED,
                history: [],
                state: 'active'
            };
        };

        const updateBeam = (beam: Beam) => {
            beam.x += beam.dx * beam.speed;
            beam.y += beam.dy * beam.speed;

            beam.history.push({ x: beam.x, y: beam.y });
            if (beam.history.length > WORM_LENGTH) {
                beam.history.shift();
            }

            if (beam.x < -100 || beam.x > canvas.width + 100 || beam.y < -100 || beam.y > canvas.height + 100) {
                Object.assign(beam, createBeam());
            }

            // Turn logic
            if (Math.abs(beam.x % GRID_SIZE) < 1 && Math.abs(beam.y % GRID_SIZE) < 1) {
                if (Math.random() < 0.15) {
                    if (beam.dx !== 0) {
                        beam.dx = 0;
                        beam.dy = Math.random() > 0.5 ? 1 : -1;
                    } else {
                        beam.dy = 0;
                        beam.dx = Math.random() > 0.5 ? 1 : -1;
                    }
                }
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = document.documentElement.classList.contains('dark');
            const colorBase = isDark ? '150, 150, 150' : '100, 100, 100';
            const gridOpacityBase = isDark ? 0.08 : 0.15;
            const beamOpacityBase = isDark ? 0.25 : 0.4;

            const cx = cursorRef.current.x;
            const cy = cursorRef.current.y;

            // 1. Draw Static Grid with Soft Proximity
            ctx.lineWidth = 1;
            const startX = Math.floor((cx - GLOW_RADIUS) / GRID_SIZE) * GRID_SIZE;
            const endX = Math.ceil((cx + GLOW_RADIUS) / GRID_SIZE) * GRID_SIZE;
            const startY = Math.floor((cy - GLOW_RADIUS) / GRID_SIZE) * GRID_SIZE;
            const endY = Math.ceil((cy + GLOW_RADIUS) / GRID_SIZE) * GRID_SIZE;

            for (let x = startX; x <= endX; x += GRID_SIZE) {
                for (let y = startY; y <= endY; y += GRID_SIZE) {
                    const dist = Math.hypot(x - cx, y - cy);
                    if (dist < GLOW_RADIUS) {
                        const alpha = Math.pow(1 - dist / GLOW_RADIUS, 2) * gridOpacityBase;
                        ctx.strokeStyle = `rgba(${colorBase}, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
                        ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
                        ctx.stroke();
                    }
                }
            }

            // 2. Draw Beams with Soft Proximity
            ctx.lineWidth = 1.2;
            ctx.lineCap = 'round';

            beams.forEach(beam => {
                updateBeam(beam);

                if (beam.history.length > 1) {
                    const headDist = Math.hypot(beam.x - cx, beam.y - cy);

                    if (headDist < GLOW_RADIUS) {
                        const alpha = Math.pow(1 - headDist / GLOW_RADIUS, 2) * beamOpacityBase;
                        ctx.strokeStyle = `rgba(${colorBase}, ${alpha})`;

                        ctx.beginPath();
                        ctx.moveTo(beam.history[0].x, beam.history[0].y);
                        for (let i = 1; i < beam.history.length; i++) {
                            ctx.lineTo(beam.history[i].x, beam.history[i].y);
                        }
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(draw);
        };

        const onMouseMove = (e: MouseEvent) => {
            cursorRef.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);

        resize();
        const animId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: -1,
                pointerEvents: 'none',
                width: '100vw',
                height: '100vh',
            }}
        />
    );
};

export default GridBackground;
