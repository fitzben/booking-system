import { useRef, useState, useEffect } from "react";
import { Modal, Typography, Divider, Space, Button, Tooltip } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  SwapOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
  DollarOutlined,
  SafetyOutlined,
  UserOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import { SOP_SECTIONS, type SopSection } from "../../data/sop-content";

const { Text, Paragraph } = Typography;

const ICON_MAP: Record<SopSection["icon"], ReactNode> = {
  file: <FileTextOutlined />,
  check: <CheckCircleOutlined />,
  team: <TeamOutlined />,
  swap: <SwapOutlined />,
  tool: <ToolOutlined />,
  warning: <WarningOutlined />,
  stop: <StopOutlined />,
  dollar: <DollarOutlined />,
  safety: <SafetyOutlined />,
  user: <UserOutlined />,
};

interface SOPModalProps {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export default function SOPModal({ open, onClose, onAgree }: SOPModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHasScrolled(false);
    setTimeout(() => {
      const el = scrollRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 20) setHasScrolled(true);
    }, 100);
  }, [open]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setHasScrolled(true);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#1e3a5f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileTextOutlined style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Standard Operating Procedure (SOP)
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
              Penggunaan Studio &amp; Fasilitas — PT. MD Entertainment, Tbk
            </div>
          </div>
        </Space>
      }
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {!hasScrolled && (
            <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>
              <DownOutlined style={{ marginRight: 4 }} />
              Scroll ke bawah untuk melanjutkan
            </Text>
          )}
          <Button onClick={onClose}>Tutup</Button>
          <Tooltip title={!hasScrolled ? "Scroll ke bawah hingga akhir terlebih dahulu" : undefined}>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={!hasScrolled}
              onClick={() => {
                onAgree();
                onClose();
              }}
              style={{
                background: hasScrolled ? "#1e3a5f" : undefined,
                borderColor: hasScrolled ? "#1e3a5f" : undefined,
                fontWeight: 600,
                color: hasScrolled ? "#fff" : undefined,
              }}
            >
              Saya Memahami &amp; Setuju
            </Button>
          </Tooltip>
        </div>
      }
      width="min(720px, calc(100vw - 32px))"
      styles={{ body: { padding: 0 } }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ maxHeight: "65vh", overflowY: "auto", padding: "16px 24px" }}
      >
        {/* Header info */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 13, color: "#1e40af" }}>
            Dokumen ini merupakan SOP resmi PT. MD Entertainment, Tbk. Dengan
            menyetujui, Anda menyatakan telah membaca, memahami, dan bersedia
            mematuhi seluruh ketentuan yang berlaku.
          </Text>
        </div>

        {/* Sections */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
          {SOP_SECTIONS.map((section: SopSection, i: number) => (
            <div key={i}>
              {i > 0 && <Divider style={{ margin: "14px 0" }} />}
              <Space align="start" style={{ width: "100%" }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    flexShrink: 0,
                    marginTop: 1,
                    background: `${section.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: section.color,
                    fontSize: 14,
                  }}
                >
                  {ICON_MAP[section.icon]}
                </div>
                <div style={{ flex: 1 }}>
                  <Text
                    strong
                    style={{ fontSize: 13, display: "block", marginBottom: 6 }}
                  >
                    {section.title}
                  </Text>
                  {section.content && (
                    <Paragraph
                      style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}
                    >
                      {section.content}
                    </Paragraph>
                  )}
                  {section.subTitle && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      {section.subTitle}
                    </Text>
                  )}
                  {section.subItems && (
                    <ul style={{ margin: "0 0 6px", paddingLeft: 16 }}>
                      {section.subItems.map((item: string, j: number) => (
                        <li key={j}>
                          <Text style={{ fontSize: 13, color: "#374151" }}>
                            {item}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.points && (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {section.points.map((point: string, j: number) => (
                        <li key={j}>
                          <Text style={{ fontSize: 13, color: "#374151" }}>
                            {point}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Space>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "10px 14px",
            marginTop: 20,
          }}
        >
          <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>
            SOP ini berlaku efektif dan wajib dipatuhi oleh seluruh pengguna
            studio. PT. MD Entertainment, Tbk berhak melakukan perubahan
            sewaktu-waktu.
          </Text>
        </div>
      </div>
    </Modal>
  );
}
