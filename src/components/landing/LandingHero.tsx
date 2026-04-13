import { useState, useEffect } from 'react';
import { Button, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import { ArrowDownOutlined } from '@ant-design/icons';
import { LANDING_THEME, LANDING_COLORS } from '../../lib/theme';
import './LandingHero.css';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1598466173959-b91f4463fe5e?auto=format&fit=crop&q=80&w=2000';

interface LandingHeroProps {
  videoSrc?: string;
  bgImage?: string;
}

export default function LandingHero({
  videoSrc: videoSrcProp,
  bgImage: bgImageProp,
}: LandingHeroProps) {
  const [settingUrl, setSettingUrl] = useState<string | null>(null);
  const [settingType, setSettingType] = useState<'image' | 'video' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [urlRes, typeRes] = await Promise.all([
          fetch('/api/settings?key=landing_bg_url').then(r => r.json() as Promise<{ value: string | null }>),
          fetch('/api/settings?key=landing_bg_type').then(r => r.json() as Promise<{ value: string | null }>),
        ]);
        if (urlRes.value) {
          setSettingUrl(urlRes.value);
          setSettingType((typeRes.value as 'image' | 'video') ?? 'image');
        }
      } catch {
        // network error — fall through to prop/default
      }
    })();
  }, []);

  // Settings take priority over props; props are kept for backward-compat / direct usage
  const videoSrc  = settingType === 'video'  ? (settingUrl ?? undefined) : videoSrcProp;
  const bgImage   = settingType === 'image'  ? (settingUrl ?? bgImageProp ?? FALLBACK_IMAGE)
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
              <source src={videoSrc} type={videoSrc.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
            </video>
          ) : (
            <div className="hero-image" style={{ backgroundImage: `url('${bgImage}')` }} />
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
            Studio &amp; <em>Function Room</em><br />Booking
          </h1>

          <p className="hero-tagline">
            Your creative vision deserves the right space.
          </p>

          <p className="hero-desc">
            Ajukan peminjaman studio dan function room profesional kami untuk keperluan{' '}
            <strong>produksi film, TV, iklan, konten digital,</strong> dan event korporat Anda.{' '}
            Paket fleksibel, harga transparan — <strong>book with confidence.</strong>
          </p>

          <div className="hero-ctas">
            <Button
              type="primary"
              size="large"
              href="/booking"
              className="hero-btn-primary"
            >
              Book Studio / Room
            </Button>
            <Button
              size="large"
              href="#rooms"
              className="hero-btn-secondary"
            >
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

