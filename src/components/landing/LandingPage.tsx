import { ConfigProvider, Typography } from "antd";
import { StyleProvider } from '@ant-design/cssinjs';
import { CalendarOutlined } from "@ant-design/icons";
import {
  LANDING_THEME,
  LANDING_COLORS,
  MD_THEME,
  COLORS,
} from "../../lib/theme";
import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import RoomsSection from "./RoomsSection";
import WhySection from "./WhySection";
import ContactSection from "./ContactSection";
import BookingForm from "../booking/BookingForm";
import BookingFormSimple from "../booking/BookingFormSimple";

const { Text } = Typography;

export default function LandingPage() {
  return (
    <StyleProvider ssrInline layer hashPriority="high">
    <ConfigProvider theme={LANDING_THEME}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        html { scroll-behavior: smooth; }
        .booking-section {
          background: #f0f2f5;
          padding: 96px 24px 80px;
        }
        .booking-section-inner {
          max-width: 900px;
          margin: 0 auto;
        }
        .booking-section-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .landing-footer {
          background: ${LANDING_COLORS.bg};
          border-top: 1px solid ${LANDING_COLORS.border};
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        @media (max-width: 768px) {
          .booking-section { padding: 64px 16px 56px; }
        }
      `}</style>

      <div
        style={{
          background: LANDING_COLORS.bg,
          minHeight: "100vh",
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <LandingNav />
        <LandingHero videoSrc="https://player.vimeo.com/external/494252666.hd.mp4?s=720946059d08e587935deec5d53c2547b972e39e&profile_id=175" />
        <RoomsSection />
        <WhySection />
        <ContactSection />

        {/* ── Booking Form Section ────────────────────────────────────────── */}
        <section id="booking-form" className="booking-section">
          <div className="booking-section-inner">
            <div className="booking-section-header">
              <div
                style={{
                  display: "inline-block",
                  background: "rgba(201,162,39,0.1)",
                  border: "1px solid rgba(201,162,39,0.3)",
                  color: COLORS.gold,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "5px 14px",
                  borderRadius: 100,
                  marginBottom: 16,
                }}
              >
                Formulir Peminjaman
              </div>
              <h2
                style={{
                  color: "#0d1321",
                  fontSize: "clamp(24px, 4vw, 36px)",
                  fontWeight: 800,
                  margin: "0 0 10px",
                  lineHeight: 1.2,
                }}
              >
                Ajukan Peminjaman
              </h2>
              <p style={{ color: "#6b7280", fontSize: 16, margin: 0 }}>
                Isi formulir berikut untuk mengajukan peminjaman ruangan atau
                studio kami. Tim kami akan menghubungi Anda untuk konfirmasi
                lebih lanjut.
              </p>
            </div>

            {/* Render BookingForm with gold theme, no layout wrapper */}
            <ConfigProvider theme={MD_THEME}>
              {/* <BookingFormSimple /> */}
              <BookingForm embedded />
            </ConfigProvider>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="landing-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/MDE_logo.png"
              alt="MD Entertainment Logo"
              style={{ height: 28, width: "auto" }}
            />
            <span
              style={{
                color: LANDING_COLORS.text,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              MD Entertainment
            </span>
          </div>
          <Text style={{ color: LANDING_COLORS.textMuted, fontSize: 12 }}>
            © {new Date().getFullYear()} MD Entertainment · mdentertainment.com
          </Text>
        </footer>
      </div>
    </ConfigProvider>
    </StyleProvider>
  );
}
