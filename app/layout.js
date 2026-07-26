import "./globals.css";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";

export const metadata = {
  title: "Find Cancer Support Organizations",
  description: "Find support, financial, and research organizations by cancer type.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#E9E8E4", minHeight: "100vh" }}>
        <TopBar />
        <div style={{ paddingBottom: "76px" }}>{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}