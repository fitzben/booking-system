import React from "react";
import { ConfigProvider, Layout, Space, Typography } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { CalendarOutlined } from "@ant-design/icons";
import { MD_THEME, COLORS } from "../../lib/theme";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StyleProvider ssrInline layer hashPriority="high">
      <ConfigProvider theme={MD_THEME}>
        <style>{`
        .public-header {
          padding: 0 40px !important;
          height: 72px !important;
          line-height: normal !important;
          transition: all 0.3s ease;
        }
        .brand-title {
          font-size: 18px;
          line-height: 1.1;
          transition: all 0.3s ease;
        }
        .brand-subtitle {
          font-size: 10px;
          letter-spacing: 0.12em;
          transition: all 0.3s ease;
        }
        @media (max-width: 768px) {
          .public-header {
            padding: 0 20px !important;
            height: 64px !important;
          }
          .brand-title {
            font-size: 16px;
          }
          .brand-subtitle {
            font-size: 9px;
            letter-spacing: 0.08em;
          }
        }
      `}</style>
        <Layout style={{ minHeight: "100vh" }}>
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <Header
            className="public-header"
            style={{
              background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
              display: "flex",
              alignItems: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
              zIndex: 1000,
            }}
          >
            <Space align="center" size={12}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: COLORS.gold,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CalendarOutlined
                  style={{ color: COLORS.navy, fontSize: 18 }}
                />
              </div>
              <div>
                <div
                  className="brand-title"
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                  }}
                >
                  MD Entertainment
                </div>
                <div
                  className="brand-subtitle"
                  style={{
                    color: COLORS.gold,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  Studio & Function Room Booking
                </div>
              </div>
            </Space>
          </Header>

          {/* ── Hero ────────────────────────────────────────────────────────── */}
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
              padding: "40px 24px 52px",
              textAlign: "center",
            }}
          >
            <Title
              level={2}
              style={{ color: "#fff", marginBottom: 8, fontWeight: 700 }}
            >
              Formulir Permohonan Peminjaman
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 15 }}>
              Isi formulir berikut untuk mengajukan peminjaman ruangan atau
              studio kami
            </Text>
          </div>

          {/* ── Content ─────────────────────────────────────────────────────── */}
          <Content
            style={{
              maxWidth: 820,
              margin: "0 auto",
              width: "100%",
              padding: "36px 16px 56px",
            }}
          >
            {children}
          </Content>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <Footer
            style={{
              textAlign: "center",
              background: COLORS.navy,
              color: "rgba(255,255,255,0.35)",
              fontSize: 12,
              padding: "14px 24px",
            }}
          >
            © {new Date().getFullYear()} MD Entertainment · mdentertainment.com
          </Footer>
        </Layout>
      </ConfigProvider>
    </StyleProvider>
  );
}
