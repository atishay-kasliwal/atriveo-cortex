import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Extraction Inspector",
  description: "Evaluate Gemma extraction quality from ScreenPipe evidence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
