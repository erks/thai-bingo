import { state } from "../state";
import { $ } from "../ui/dom";

export function startConfetti(): void {
    const canvas = $("confetti-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
    const particles = Array.from({ length: 180 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.15,
        drift: (Math.random() - 0.5) * 1.5,
        opacity: Math.random() * 0.5 + 0.5,
    }));
    function draw() {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        particles.forEach(p => {
            ctx!.save();
            ctx!.globalAlpha = p.opacity;
            ctx!.translate(p.x, p.y);
            ctx!.rotate(p.angle);
            ctx!.fillStyle = p.color;
            ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx!.restore();
            p.y += p.speed; p.x += p.drift; p.angle += p.spin;
            if (p.y > canvas!.height + 20) { p.y = -20; p.x = Math.random() * canvas!.width; }
        });
        state.confettiId = requestAnimationFrame(draw);
    }
    draw();
}

export function stopConfetti(): void {
    if (state.confettiId) {
        cancelAnimationFrame(state.confettiId);
        state.confettiId = null;
    }
    const canvas = $("confetti-canvas") as HTMLCanvasElement | null;
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
