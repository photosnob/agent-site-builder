import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launch & List — websites for real estate agents",
  description: "Get a modern, fast agent website in minutes, then keep it current by typing what you want changed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
