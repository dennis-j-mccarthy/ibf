import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ModeIndicator from "@/components/ModeIndicator";
import { VersionProvider } from "@/contexts/VersionContext";

export const metadata: Metadata = {
  title: "Ignatius Book Fairs | Catholic Book Fairs You Can Trust | Alternative to Scholastic",
  description: "Good books for great kids. Discover books that foster creativity, imagination, and wonder. Ignatius Book Fairs provides easy access to the best in literature aligned with Catholic virtues for schools, parishes, and parents.",
  keywords: ["book fair", "Catholic books", "Christian books", "school book fair", "parish book fair", "children's literature", "alternative to scholastic"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Adobe Fonts - Brother 1816, Open Sans, Great Vibes */}
        <link rel="stylesheet" href="https://use.typekit.net/poj1hyc.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&family=Great+Vibes&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <VersionProvider>
          <KeyboardShortcuts />
          <ModeIndicator />
          <Header />
          <main>{children}</main>
          <Footer />
        </VersionProvider>
      </body>
    </html>
  );
}
