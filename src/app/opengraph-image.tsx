import { ImageResponse } from "next/og";

export const alt = "ReservaPro. Una agenda clara para tu negocio.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #e0f2fe, #F5F7F4, #DFF9F1)", color: "#0B1220" }}><div style={{ display: "flex", fontSize: 36, color: "#087163", marginBottom: 48 }}>ReservaPro</div><div style={{ display: "flex", fontSize: 76, fontWeight: 700, maxWidth: 900 }}>Una agenda clara para tu negocio.</div><div style={{ display: "flex", fontSize: 28, marginTop: 36 }}>Servicios · Profesionales · Reservas</div></div>, size);
}
