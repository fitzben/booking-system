import { useState, useEffect } from "react";
import { Button, ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { ArrowDownOutlined, CalendarOutlined } from "@ant-design/icons";
import { LANDING_THEME, LANDING_COLORS } from "../../lib/theme";
import "./LandingHero.css";

// ── WhatsApp config ───────────────────────────────────────────────────────────
// TODO: replace with actual WA number (format: 62 + number without leading 0)
const WA_NUMBER = "6281234567890";
const WA_MESSAGE = encodeURIComponent(
  "Halo MD Entertainment, saya ingin menanyakan ketersediaan studio/function room dan proses booking.",
);
const WA_HREF = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`;

function WhatsAppIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1598466173959-b91f4463fe5e?auto=format&fit=crop&q=80&w=2000";

interface LandingHeroProps {
  videoSrc?: string;
  bgImage?: string;
}

export default function LandingHero({
  videoSrc: videoSrcProp,
  bgImage: bgImageProp,
}: LandingHeroProps) {
  const [settingUrl, setSettingUrl] = useState<string | null>(null);
  const [settingType, setSettingType] = useState<"image" | "video" | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      try {
        const [urlRes, typeRes] = await Promise.all([
          fetch("/api/settings?key=landing_bg_url").then(
            (r) => r.json() as Promise<{ value: string | null }>,
          ),
          fetch("/api/settings?key=landing_bg_type").then(
            (r) => r.json() as Promise<{ value: string | null }>,
          ),
        ]);
        if (urlRes.value) {
          setSettingUrl(urlRes.value);
          setSettingType((typeRes.value as "image" | "video") ?? "image");
        }
      } catch {
        // network error — fall through to prop/default
      }
    })();
  }, []);

  // Settings take priority over props; props are kept for backward-compat / direct usage
  const videoSrc =
    settingType === "video" ? (settingUrl ?? undefined) : videoSrcProp;
  const bgImage =
    settingType === "image"
      ? (settingUrl ?? bgImageProp ?? FALLBACK_IMAGE)
      : (bgImageProp ?? FALLBACK_IMAGE);
  return (
    <StyleProvider ssrInline layer hashPriority="high">
      <ConfigProvider theme={LANDING_THEME}>
        <section className="hero-wrap">
          <div className="hero-bg-container">
            {videoSrc ? (
              <video
                className="hero-video"
                autoPlay
                muted
                loop
                playsInline
                poster={bgImage}
              >
                <source
                  src={videoSrc}
                  type={videoSrc.endsWith(".webm") ? "video/webm" : "video/mp4"}
                />
              </video>
            ) : (
              <div
                className="hero-image"
                style={{ backgroundImage: `url('${bgImage}')` }}
              />
            )}
            <div className="hero-overlay" />
            <div className="hero-grid-overlay" />
          </div>

          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Professional Production Space · Jakarta
            </div>

            <p className="hero-logo-text">MD Entertainment</p>

            <h1 className="hero-h1">
              Studio &amp; <em>Function Room</em>
              <br />
              Booking
            </h1>

            <p className="hero-tagline">
              Your creative vision deserves the right space.
            </p>

            <p className="hero-desc">
              Ajukan peminjaman studio dan function room profesional kami untuk
              keperluan{" "}
              <strong>produksi film, TV, iklan, konten digital,</strong> dan
              event korporat Anda. Paket fleksibel, harga transparan —{" "}
              <strong>book with confidence.</strong>
            </p>

            <div className="hero-ctas">
              <Button
                type="primary"
                size="large"
                href="/booking"
                icon={<CalendarOutlined />}
                className="hero-btn-primary"
              >
                Book Studio
              </Button>
              <Button
                size="large"
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                icon={<WhatsAppIcon size={15} />}
                className="hero-btn-wa"
              >
                Book via WhatsApp
              </Button>
              <Button size="large" href="#rooms" className="hero-btn-secondary">
                Lihat Ruangan
              </Button>
            </div>
          </div>

          <a href="#rooms" className="hero-scroll">
            <span>Scroll</span>
            <ArrowDownOutlined style={{ fontSize: 14 }} />
          </a>
        </section>
      </ConfigProvider>
    </StyleProvider>
  );
}
