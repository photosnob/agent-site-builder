import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Porchlight — websites for real estate agents",
  description: "Answer a few questions, import your best assets, and launch a site that's yours to edit with plain-English prompts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
