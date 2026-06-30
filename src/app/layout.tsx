import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "./StoreProvider";

export const metadata: Metadata = {
  title: "Annotation Activity Console",
  description: "Internal console for annotation tasks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
