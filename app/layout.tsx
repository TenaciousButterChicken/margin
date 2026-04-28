import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Margin — machine learning, by hand, from scratch",
  description:
    "A 16-session course where every concept lands twice — once in the lesson, once in a Lab where you write code that runs.",
  metadataBase: new URL("https://margin.school"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      style={{
        // Bind next/font CSS variables to the token names tokens.css expects.
        ["--font-sans" as string]: `var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`,
        ["--font-mono" as string]: `var(--font-jetbrains), ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
      }}
    >
      <body>{children}</body>
    </html>
  );
}
