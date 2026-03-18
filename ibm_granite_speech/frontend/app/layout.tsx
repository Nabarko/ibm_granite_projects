import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IBM Granite Speech",
  description: "Audio transcription and sentiment analysis powered by IBM Granite Speech",
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
