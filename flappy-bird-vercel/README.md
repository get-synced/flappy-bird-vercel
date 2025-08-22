# Flappy Bird (Next.js) — Ready for Vercel

A simple, clean Flappy Bird clone built with **Next.js (App Router)** and a Canvas-based game loop.
Deploys perfectly to **Vercel**.

## Local dev

```bash
npm i
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo (`flappy-bird-vercel`).
2. Go to **vercel.com → Add New… → Project**.
3. Import the repo. Framework = **Next.js** (auto-detected).
4. Click **Deploy**. That's it.

> No special config needed. The app uses the `app/` directory and ships as a static Next.js site.

## Controls

- **Click / Tap / Space** → Flap
- **P** → Pause / Resume
- **R** → Restart (after game over)

## Notes

- High score persists in `localStorage`.
- Canvas scales to fit container and is pixel crisp on retina displays.
