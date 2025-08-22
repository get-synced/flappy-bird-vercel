import "./globals.css";
import Game from "../components/Game";

export default function Page() {
  return (
    <main className="container">
      <div className="card">
        <div className="header">
          <div className="title">Flappy Bird — Canvas (Next.js)</div>
          <div className="badge">Ready for Vercel</div>
        </div>
        <Game />
        <div className="footer">
          Click / tap / press <b>Space</b> to flap. Press <b>P</b> to pause.
        </div>
      </div>
    </main>
  );
}
