import { useState, useEffect } from 'react';
import { Button, ConfigProvider, Space } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import { CalendarOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { LANDING_THEME } from '../../lib/theme';
import "./LandingNav.css";

const NAV_LINKS = [
  { label: 'Ruangan', href: '/#rooms' },
  { label: 'Keunggulan', href: '/#why' },
  { label: 'Kontak', href: '/#contact' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <StyleProvider ssrInline layer hashPriority="high">
      <ConfigProvider theme={LANDING_THEME}>
        <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`}>
          {/* Logo */}
          <a href="/" className="nav-logo-link">
            <img 
              src="/MDE_logo.png" 
              alt="MD Entertainment Logo" 
              className="nav-logo-img"
            />
            <div className="nav-logo-text-wrap">
              <div className="nav-logo-title">
                MD Entertainment
              </div>
              <div className="nav-logo-subtitle">
                Studio Booking
              </div>
            </div>
          </a>

          {/* Desktop links */}
          <Space className="nav-desktop-links" size={28} align="center">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
            ))}
            <Button
              type="primary"
              size="small"
              href="/booking"
              className="nav-btn-book"
            >
              Book Now
            </Button>
          </Space>

          {/* Mobile hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <CloseOutlined style={{ fontSize: 20 }} /> : <MenuOutlined style={{ fontSize: 20 }} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="nav-mobile-menu">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-mobile-link" onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <Button
              type="primary"
              block
              size="large"
              href="/booking"
              className="nav-mobile-btn-book"
              onClick={() => setMenuOpen(false)}
            >
              Book Now
            </Button>
          </div>
        )}
      </ConfigProvider>
    </StyleProvider>
  );
}
