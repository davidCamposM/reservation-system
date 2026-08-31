import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { NavigationProvider } from "@/components/navigation-provider";
import { Telemetry } from "@/components/telemetry";
import { PageViewport } from "@/components/page-viewport";
import { siteUrl } from "@/lib/environment";
import "./globals.css";

/** Manrope aporta una lectura moderna y suave a toda la interfaz de ReservaPro. */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "ReservaPro | Agenda inteligente",
  description: "Reservas simples para negocios de servicios.",
  openGraph: { title: "ReservaPro | Agenda inteligente", description: "Una agenda clara para servicios, profesionales y reservas.", locale: "es_CL", type: "website", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} antialiased`}>
        <NavigationProvider>
          <div className="app-shell">
            <a href="#main-content" className="skip-navigation">Saltar al contenido</a>
            <SiteHeader user={session ? { id: session.user.id, name: session.user.name, role: session.user.role } : null} />
            <PageViewport>{children}</PageViewport>
          </div>
        </NavigationProvider>
        <Telemetry />
      </body>
    </html>
  );
}
