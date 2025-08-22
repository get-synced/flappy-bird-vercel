"use client";
import { useEffect, useRef, useState } from "react";

const BASE_W = 400;
const BASE_H = 600;

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function Game() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState("menu"); // menu | playing | gameover

  // game objects in refs so we don't re-render every frame
  const birdRef = useRef(null);
  const pipesRef = useRef([]);
  const tRef = useRef({ last: 0, acc: 0 });
  const configRef = useRef({
    gravity: 1400,
    jump: -360,
    pipeGap: 150,
    pipeW: 70,
    pipeEvery: 1.15,
    speed: 180,
    groundH: 90,
  });

  useEffect(() => {
    let saved = 0;
    try {
      saved = Number(localStorage.getItem("flappy_best") || "0");
    } catch {}
    setBest(saved);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const maxWidth = Math.min(wrapRef.current.clientWidth, 520);
      const scale = maxWidth / BASE_W;
      canvas.style.width = maxWidth + "px";
      canvas.style.height = BASE_H * scale + "px";
      canvas.width = Math.floor(BASE_W * scale * dpr);
      canvas.height = Math.floor(BASE_H * scale * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      // fill background
      ctx.fillStyle = "#7DD3FC";
      ctx.fillRect(0, 0, BASE_W, BASE_H);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);

    // init game
    resetGame();

    let anim;
    const step = (ts) => {
      if (state === "menu" || paused) {
        draw(ctx);
        anim = requestAnimationFrame(step);
        return;
      }
      if (!tRef.current.last) tRef.current.last = ts;
      let dt = (ts - tRef.current.last) / 1000;
      // cap dt to avoid huge jumps on tab switch
      dt = Math.min(dt, 0.033 * 2);
      tRef.current.last = ts;

      update(dt);
      draw(ctx);

      anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);

    function onPointerDown(e) {
      if (state === "menu") {
        setState("playing");
        flap();
        return;
      }
      if (state === "gameover") {
        resetGame();
        setState("playing");
        flap();
        return;
      }
      if (state === "playing") {
        flap();
      }
    }
    function onKeyDown(e) {
      if (e.code === "Space") {
        e.preventDefault();
        onPointerDown();
      } else if (e.key.toLowerCase() === "p") {
        setPaused((p) => !p);
      } else if (e.key.toLowerCase() === "r") {
        resetGame();
        setState("menu");
        setPaused(false);
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(anim);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, paused]);

  function resetGame() {
    setScore(0);
    const bird = {
      x: 80,
      y: BASE_H * 0.5,
      r: 14,
      vy: 0,
      angle: 0,
    };
    birdRef.current = bird;
    pipesRef.current = [];
    tRef.current = { last: 0, acc: 0, timeToNext: 0 };
  }

  function flap() {
    const bird = birdRef.current;
    bird.vy = configRef.current.jump;
    bird.angle = -0.35;
  }

  function spawnPipe() {
    const { pipeW, pipeGap, groundH } = configRef.current;
    const minY = 60;
    const maxY = BASE_H - groundH - 60 - pipeGap;
    const gapY = randBetween(minY, maxY);
    const pipe = {
      x: BASE_W + pipeW,
      gapY,
      passed: false,
    };
    pipesRef.current.push(pipe);
  }

  function update(dt) {
    const cfg = configRef.current;
    const bird = birdRef.current;

    // spawn pipes
    tRef.current.timeToNext -= dt;
    if (tRef.current.timeToNext <= 0) {
      spawnPipe();
      tRef.current.timeToNext = cfg.pipeEvery;
      // speed ramps slightly with score
      cfg.speed = 180 + Math.min(120, score * 8);
    }

    // bird physics
    bird.vy += cfg.gravity * dt;
    bird.y += bird.vy * dt;
    bird.angle = Math.min(0.5, bird.angle + dt * 1.4);

    // pipes move
    for (const p of pipesRef.current) {
      p.x -= cfg.speed * dt;
      if (!p.passed && p.x + cfg.pipeW < bird.x - bird.r) {
        p.passed = true;
        setScore((s) => s + 1);
      }
    }
    // remove offscreen pipes
    pipesRef.current = pipesRef.current.filter(p => p.x + cfg.pipeW > -10);

    // collisions
    const hitGround = bird.y + bird.r >= BASE_H - cfg.groundH;
    const hitCeil = bird.y - bird.r <= 0;
    if (hitGround || hitCeil) {
      gameOver();
      return;
    }
    // pipe collision
    for (const p of pipesRef.current) {
      const inPipeX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + cfg.pipeW;
      if (inPipeX) {
        const topH = p.gapY;
        const botY = p.gapY + cfg.pipeGap;
        const hitTop = bird.y - bird.r < topH;
        const hitBot = bird.y + bird.r > botY;
        if (hitTop || hitBot) {
          gameOver();
          return;
        }
      }
    }
  }

  function gameOver() {
    setState("gameover");
    // persist high score
    setBest((prev) => {
      const newBest = Math.max(prev, score);
      try { localStorage.setItem("flappy_best", String(newBest)); } catch {}
      return newBest;
    });
  }

  function draw(ctx) {
    // sky
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    // parallax clouds
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) {
      const x = (Date.now() * 0.02 + i * 150) % (BASE_W + 100) - 100;
      drawCloud(ctx, x, 90 + i * 35);
    }
    ctx.globalAlpha = 1;

    const cfg = configRef.current;

    // pipes
    for (const p of pipesRef.current) {
      const topH = p.gapY;
      const botY = p.gapY + cfg.pipeGap;
      ctx.fillStyle = "#2BD96B";
      // top
      ctx.fillRect(p.x, 0, cfg.pipeW, topH);
      // bottom
      ctx.fillRect(p.x, botY, cfg.pipeW, BASE_H - botY - cfg.groundH);
      // lip
      ctx.fillStyle = "#1FB858";
      ctx.fillRect(p.x - 4, topH - 14, cfg.pipeW + 8, 14);
      ctx.fillRect(p.x - 4, botY, cfg.pipeW + 8, 14);
    }

    // ground
    ctx.fillStyle = "#E2C571";
    ctx.fillRect(0, BASE_H - cfg.groundH, BASE_W, cfg.groundH);
    // ground stripe
    ctx.fillStyle = "#D3B45A";
    ctx.fillRect(0, BASE_H - cfg.groundH, BASE_W, 12);

    // bird
    const b = birdRef.current;
    drawBird(ctx, b.x, b.y, b.r, b.angle);

    // UI: score
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.font = "bold 42px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "center";
    ctx.fillText(String(score), BASE_W / 2, 70);

    // overlays
    if (state === "menu") {
      drawOverlay(ctx, "Click / Tap / Space to Flap", "P: Pause", "Flap between the pipes!");
    } else if (state === "gameover") {
      drawOverlay(ctx, "Game Over", `Score: ${score}  ·  Best: ${best}`, "Press R to restart");
    } else if (paused) {
      drawOverlay(ctx, "Paused", "Press P to resume", "");
    }
  }

  function drawCloud(ctx, x, y) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 20, y - 8, 22, 0, Math.PI * 2);
    ctx.arc(x + 45, y, 18, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  function drawBird(ctx, x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // body
    const grd = ctx.createLinearGradient(-r, -r, r, r);
    grd.addColorStop(0, "#FFD166");
    grd.addColorStop(1, "#F4A261");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // wing
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(-4, 4, r * 0.7, r * 0.45, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = "#E76F51";
    ctx.beginPath();
    ctx.moveTo(r + 2, -2);
    ctx.lineTo(r + 12, 0);
    ctx.lineTo(r + 2, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawOverlay(ctx, title, subtitle, hint) {
    ctx.save();
    // panel
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    const panelW = 290;
    const panelH = 140;
    const x = (BASE_W - panelW) / 2;
    const y = 180;
    ctx.fillRect(x, y, panelW, panelH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);

    ctx.fillStyle = "#0b1726";
    ctx.textAlign = "center";
    ctx.font = "bold 20px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(title, BASE_W / 2, y + 34);
    ctx.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(subtitle, BASE_W / 2, y + 64);
    ctx.font = "500 12px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(hint, BASE_W / 2, y + 94);
    ctx.restore();
  }

  return (
    <div>
      <div className="topbar">
        <div>Score: <b>{score}</b></div>
        <div>Best: <b>{best}</b></div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn small" onClick={() => {
            if (state === "gameover") {
              resetGame();
              setState("menu");
              setPaused(false);
              return;
            }
            setPaused((p) => !p);
          }}>{paused ? "Resume" : (state === "gameover" ? "Reset" : "Pause")}</button>
          <button className="btn small" onClick={() => {
            resetGame();
            setState("menu");
            setPaused(false);
          }}>Restart</button>
        </div>
      </div>
      <div ref={wrapRef} className="canvasWrap">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
