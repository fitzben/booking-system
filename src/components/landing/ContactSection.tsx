import { useEffect, useState } from 'react';
import { Button, Row, Col, Typography, ConfigProvider, Space } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import {
  WhatsAppOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { LANDING_THEME } from '../../lib/theme';
import { getContactSettings, buildWaUrl } from '../../lib/api';
import type { ContactSettings } from '../../lib/api';
import "./ContactSection.css";

const { Title, Text } = Typography;

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function InfoRow({ icon, label, children }: InfoRowProps) {
  return (
    <div className="info-row">
      <div className="info-icon-wrap">
        {icon}
      </div>
      <div>
        <div className="info-label">
          {label}
        </div>
        <div className="info-content">{children}</div>
      </div>
    </div>
  );
}

export default function ContactSection() {
  const [contact, setContact] = useState<ContactSettings | null>(null);

  useEffect(() => {
    getContactSettings().then(setContact).catch(() => {});
  }, []);

  const waUrl = contact
    ? buildWaUrl(contact.contact_whatsapp, contact.contact_wa_template)
    : '#';

  return (
    <StyleProvider ssrInline layer hashPriority="high">
    <ConfigProvider theme={LANDING_THEME}>
      <section id="contact" className="contact-section">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="contact-header">
            <div className="contact-eyebrow">Hubungi Kami</div>
            <Title level={2} className="contact-title">
              Ada Pertanyaan?
            </Title>
            <Text className="contact-subtitle">
              Tim kami siap membantu Anda menemukan ruangan yang tepat.
            </Text>
          </div>

          <Row gutter={[24, 24]} align="stretch">
            <Col xs={24} lg={14}>
              <div className="contact-panel">
                {contact?.contact_whatsapp && (
                  <InfoRow
                    icon={<WhatsAppOutlined style={{ fontSize: 22, color: "#22d3ee" }} />}
                    label="WhatsApp"
                  >
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="info-link"
                    >
                      +{contact.contact_whatsapp}
                    </a>
                    <div className="info-hint">
                      Respon cepat, tersedia di jam kerja
                    </div>
                  </InfoRow>
                )}

                {contact?.contact_email && (
                  <InfoRow
                    icon={<MailOutlined style={{ fontSize: 22, color: "#22d3ee" }} />}
                    label="Email"
                  >
                    <a
                      href={`mailto:${contact.contact_email}`}
                      className="info-link"
                    >
                      {contact.contact_email}
                    </a>
                    <div className="info-hint">
                      Untuk permintaan formal dan penawaran khusus
                    </div>
                  </InfoRow>
                )}

                {contact?.contact_address && (
                  <InfoRow
                    icon={<EnvironmentOutlined style={{ fontSize: 22, color: "#22d3ee" }} />}
                    label="Alamat"
                  >
                    <div className="info-address">
                      {contact.contact_address}
                    </div>
                    {contact.contact_gmaps && (
                      <Button
                        size="small"
                        icon={<CompassOutlined />}
                        href={contact.contact_gmaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="info-btn-maps"
                      >
                        Open in Maps
                      </Button>
                    )}
                  </InfoRow>
                )}

                {contact?.contact_hours && (
                  <InfoRow
                    icon={<ClockCircleOutlined style={{ fontSize: 22, color: "#22d3ee" }} />}
                    label="Jam Operasional"
                  >
                    <div className="info-hours">
                      {contact.contact_hours}
                    </div>
                  </InfoRow>
                )}
              </div>
            </Col>

            <Col xs={24} lg={10}>
              <div className="contact-cta-panel">
                <div className="cta-tag">
                  Siap booking?
                </div>
                <Title level={3} className="cta-title">
                  Ajukan Peminjaman Sekarang
                </Title>
                <Text className="cta-desc">
                  Isi formulir peminjaman di bawah ini untuk mengajukan booking studio atau ruangan.
                  Tim kami akan menghubungi Anda dalam 1×24 jam kerja untuk konfirmasi.
                </Text>

                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    size="large"
                    block
                    href="/booking"
                    className="cta-btn-booking"
                  >
                    Isi Formulir Booking
                  </Button>
                  {contact?.contact_whatsapp && (
                    <Button
                      size="large"
                      block
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      icon={<WhatsAppOutlined />}
                      className="cta-btn-wa"
                    >
                      Chat via WhatsApp
                    </Button>
                  )}
                </Space>
              </div>
            </Col>
          </Row>
        </div>
      </section>
    </ConfigProvider>
    </StyleProvider>
  );
}
