export const metadata = {
  title: "Flappy Bird — Next.js",
  description: "A clean Flappy Bird clone you can deploy on Vercel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
