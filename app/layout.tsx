import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launch & List — websites for real estate agents",
  description: "Get a modern, fast agent website in minutes, then keep it current by typing what you want changed.",
  // Launch & List's own icon. Agent sites override this with their own (app/s and app/h layouts).
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
