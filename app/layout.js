import "./globals.css";
import { Fraunces, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";
import ThemeInit from "../components/ThemeInit";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-work-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
});

export const metadata = {
  title: "Find Cancer Support Organizations",
  description: "Find support, financial, and research organizations by cancer type.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${workSans.variable} ${plexMono.variable}`}
    >
      <body style={{ margin: 0, minHeight: "100vh" }}>
        <ThemeInit />
        <TopBar />
        <div style={{ paddingBottom: "76px" }}>{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}