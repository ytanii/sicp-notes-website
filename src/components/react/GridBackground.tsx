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
        const GRID_SIZE = 70; // Larger grid for less density
        const NUM_SECTORS_X = 5;
        const NUM_SECTORS_Y = 3;
        const NUM_BEAMS = 15; // Fewer beams total
        const BEAM_SPEED = 1.6; // Slightly faster for flow
        const WORM_LENGTH = 400;
        const GLOW_RADIUS = 500;

        // Shared occupancy map to prevent intersections
        // Tracks which grid segments are occupied: "x1,y1-x2,y2"
        const occupiedSegments = new Set<string>();

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initBeams();
        };

        const initBeams = () => {
            beams = [];
            for (let y = 0; y < NUM_SECTORS_Y; y++) {
                for (let x = 0; x < NUM_SECTORS_X; x++) {
                    beams.push(createBeamInSector(x, y));
                }
            }
        };

        const createBeamInSector = (sx: number, sy: number): Beam => {
            const sectorW = canvas.width / NUM_SECTORS_X;
            const sectorH = canvas.height / NUM_SECTORS_Y;
            const startX = sx * sectorW;
            const startY = sy * sectorH;

            const x = Math.floor((startX + Math.random() * sectorW) / GRID_SIZE) * GRID_SIZE;
            const y = Math.floor((startY + Math.random() * sectorH) / GRID_SIZE) * GRID_SIZE;

            const dir = Math.floor(Math.random() * 4);
            let dx = 0, dy = 0;
            if (dir === 0) dx = 1; else if (dir === 1) dx = -1; else if (dir === 2) dy = 1; else if (dir === 3) dy = -1;

            return { x, y, dx, dy, speed: BEAM_SPEED, history: [], state: 'active' };
        };

        const findEmptiestSector = () => {
            const counts = new Array(NUM_SECTORS_X * NUM_SECTORS_Y).fill(0);
            beams.forEach(b => {
                const cx = Math.max(0, Math.min(NUM_SECTORS_X - 1, Math.floor(b.x / (canvas.width / NUM_SECTORS_X))));
                const cy = Math.max(0, Math.min(NUM_SECTORS_Y - 1, Math.floor(b.y / (canvas.height / NUM_SECTORS_Y))));
                counts[cy * NUM_SECTORS_X + cx]++;
            });
            let min = Math.min(...counts);
            const candidates = counts.map((c, i) => c === min ? i : -1).filter(i => i !== -1);
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            return { x: chosen % NUM_SECTORS_X, y: Math.floor(chosen / NUM_SECTORS_X) };
        };

        const updateBeam = (beam: Beam) => {
            beam.x += beam.dx * beam.speed;
            beam.y += beam.dy * beam.speed;

            beam.history.push({ x: beam.x, y: beam.y });
            if (beam.history.length > WORM_LENGTH) beam.history.shift();

            // Boundary check
            if (beam.x < -GRID_SIZE || beam.x > canvas.width + GRID_SIZE ||
                beam.y < -GRID_SIZE || beam.y > canvas.height + GRID_SIZE) {
                const s = findEmptiestSector();
                Object.assign(beam, createBeamInSector(s.x, s.y));
                return;
            }

            // At intersection logic
            if (Math.abs(beam.x % GRID_SIZE) < BEAM_SPEED && Math.abs(beam.y % GRID_SIZE) < BEAM_SPEED) {
                beam.x = Math.round(beam.x / GRID_SIZE) * GRID_SIZE;
                beam.y = Math.round(beam.y / GRID_SIZE) * GRID_SIZE;

                // Decision: turn if random OR if current path blocked
                const currentSegId = [beam.x, beam.y, beam.x + beam.dx * GRID_SIZE, beam.y + beam.dy * GRID_SIZE].sort().join(',');
                const shouldTurn = Math.random() < 0.15 || occupiedSegments.has(currentSegId);

                if (shouldTurn) {
                    const directions = [
                        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
                    ].filter(d => !(d.dx === -beam.dx && d.dy === -beam.dy));

                    // Prefer to stay in current sector
                    const currentSectorX = Math.floor(beam.x / (canvas.width / NUM_SECTORS_X));
                    const currentSectorY = Math.floor(beam.y / (canvas.height / NUM_SECTORS_Y));

                    directions.sort((a, b) => {
                        const nextAx = beam.x + a.dx * GRID_SIZE;
                        const nextAy = beam.y + a.dy * GRID_SIZE;
                        const nextBx = beam.x + b.dx * GRID_SIZE;
                        const nextBy = beam.y + b.dy * GRID_SIZE;

                        const inSectorA = Math.floor(nextAx / (canvas.width / NUM_SECTORS_X)) === currentSectorX &&
                            Math.floor(nextAy / (canvas.height / NUM_SECTORS_Y)) === currentSectorY;
                        const inSectorB = Math.floor(nextBx / (canvas.width / NUM_SECTORS_X)) === currentSectorX &&
                            Math.floor(nextBy / (canvas.height / NUM_SECTORS_Y)) === currentSectorY;

                        if (inSectorA && !inSectorB) return -1;
                        if (!inSectorA && inSectorB) return 1;
                        return Math.random() - 0.5; // Randomize if both are in/out
                    });

                    for (const dir of directions) {
                        const nx = beam.x + dir.dx * GRID_SIZE;
                        const ny = beam.y + dir.dy * GRID_SIZE;
                        const sid = [beam.x, beam.y, nx, ny].sort().join(',');

                        if (!occupiedSegments.has(sid)) {
                            beam.dx = dir.dx;
                            beam.dy = dir.dy;
                            break;
                        }
                    }
                }
            }

            // Register current path AS WE GO to prevent other beams from picking it this frame
            const regX = Math.round(beam.x / GRID_SIZE) * GRID_SIZE;
            const regY = Math.round(beam.y / GRID_SIZE) * GRID_SIZE;
            const nextX = Math.round((beam.x + beam.dx * GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
            const nextY = Math.round((beam.y + beam.dy * GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
            occupiedSegments.add([regX, regY, nextX, nextY].sort().join(','));
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = document.documentElement.classList.contains('dark');
            const colorBase = isDark ? '220, 220, 220' : '60, 60, 60';
            const gridOpacityBase = isDark ? 0.12 : 0.18;
            const beamOpacityBase = isDark ? 0.45 : 0.6;

            const cx = cursorRef.current.x;
            const cy = cursorRef.current.y;

            // 1. Pre-populate occupancy from HISTORY only
            occupiedSegments.clear();
            beams.forEach(beam => {
                // Skip the current/first history point to allow turning flexibility
                for (let j = GRID_SIZE * 2; j < beam.history.length; j += GRID_SIZE) {
                    const p1 = beam.history[j - GRID_SIZE];
                    const p2 = beam.history[j];
                    const sX = Math.round(p1.x / GRID_SIZE) * GRID_SIZE;
                    const sY = Math.round(p1.y / GRID_SIZE) * GRID_SIZE;
                    const eX = Math.round(p2.x / GRID_SIZE) * GRID_SIZE;
                    const eY = Math.round(p2.y / GRID_SIZE) * GRID_SIZE;
                    occupiedSegments.add([sX, sY, eX, eY].sort().join(','));
                }
            });

            // 2. Draw Static Grid Points
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
                        ctx.fillStyle = `rgba(${colorBase}, ${alpha})`;
                        ctx.fillRect(x - 1, y - 1, 2, 2);
                    }
                }
            }

            // 3. Update and Draw Beams
            ctx.lineWidth = 0.9; // Slightly thicker for visibility
            ctx.lineCap = 'round';

            beams.forEach((beam) => {
                updateBeam(beam);

                if (beam.history.length > 1) {
                    const headDist = Math.hypot(beam.x - cx, beam.y - cy);

                    if (headDist < GLOW_RADIUS) {
                        const alpha = Math.pow(1 - headDist / GLOW_RADIUS, 2) * beamOpacityBase;

                        // 1. Draw the long dim tail
                        ctx.beginPath();
                        ctx.moveTo(beam.history[0].x, beam.history[0].y);
                        for (let j = 1; j < beam.history.length; j++) {
                            ctx.lineTo(beam.history[j].x, beam.history[j].y);
                        }
                        ctx.strokeStyle = `rgba(${colorBase}, ${alpha * 0.25})`; // Very dim
                        ctx.stroke();

                        // 2. Draw the bright "head" pulse
                        ctx.beginPath();
                        const headStart = Math.max(0, beam.history.length - 40);
                        ctx.moveTo(beam.history[headStart].x, beam.history[headStart].y);
                        for (let j = headStart + 1; j < beam.history.length; j++) {
                            ctx.lineTo(beam.history[j].x, beam.history[j].y);
                        }
                        ctx.strokeStyle = `rgba(${colorBase}, ${alpha})`;
                        ctx.stroke();

                        // 3. Add a tiny glowing tip
                        ctx.fillStyle = `rgba(${colorBase}, ${alpha * 1.5})`;
                        ctx.beginPath();
                        ctx.arc(beam.x, beam.y, 1, 0, Math.PI * 2);
                        ctx.fill();
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
