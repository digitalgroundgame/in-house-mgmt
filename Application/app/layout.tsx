import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/dates/styles.css";
import { Geist, Geist_Mono } from "next/font/google";
import NavbarSimple from "./components/Navbar/Navbar";
import { UserProvider } from "./components/provider/UserContext";
import { TimezoneProvider } from "./components/provider/TimezoneContext";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { theme } from "./lib/theme";
// Import datetime utils to ensure dayjs plugins are configured
import "@/app/utils/datetime";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DGG CRM",
  description: "Volunteer Console CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>

      <body>
        <UserProvider>
          <MantineProvider theme={theme}>
            <TimezoneProvider>
              <div style={{ display: "flex" }}>
                <NavbarSimple />
                <main style={{ flex: 1, padding: "20px" }}>{children}</main>
              </div>
            </TimezoneProvider>
          </MantineProvider>
        </UserProvider>
      </body>
    </html>
  );
}
