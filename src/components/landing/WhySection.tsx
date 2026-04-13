import { Row, Col, Typography, ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import {
  ThunderboltOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { LANDING_THEME } from '../../lib/theme';
import "./WhySection.css";

const { Title, Text } = Typography;

const BENEFITS = [
  {
    icon: ThunderboltOutlined,
    color: '#22d3ee',
    title: 'Studio Profesional',
    titleEn: 'Professional-grade studio',
    desc: 'Dilengkapi peralatan pencahayaan dan backdrop profesional. Digunakan untuk produksi film, iklan TV, dan konten digital berstandar industri.',
  },
  {
    icon: DollarOutlined,
    color: '#34d399',
    title: 'Harga Transparan',
    titleEn: 'No hidden fees',
    desc: 'Paket harga jelas per durasi, tanpa biaya tersembunyi. Pilih paket yang sesuai kebutuhan — dari sesi singkat hingga sewa full day.',
  },
  {
    icon: EnvironmentOutlined,
    color: '#f59e0b',
    title: 'Lokasi Strategis',
    titleEn: 'Easily accessible',
    desc: 'Berlokasi di pusat Jakarta, mudah dijangkau dari berbagai penjuru kota. Tersedia parkir di area gedung.',
  },
  {
    icon: TeamOutlined,
    color: '#a78bfa',
    title: 'Tim Berpengalaman',
    titleEn: 'Experienced crew',
    desc: 'Didukung tim teknis dan kreatif berpengalaman di industri broadcast dan produksi, siap membantu mewujudkan visi Anda.',
  },
];

export default function WhySection() {
  return (
    <StyleProvider ssrInline layer hashPriority="high">
    <ConfigProvider theme={LANDING_THEME}>
      <section id="why" className="why-section">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="why-header">
            <div className="why-eyebrow">Keunggulan Kami</div>
            <Title level={2} className="why-title">
              Mengapa Booking di MD?
            </Title>
            <Text className="why-subtitle">
              Dipercaya oleh production house, kreator konten, dan tim kreatif dari seluruh Indonesia.
            </Text>
          </div>

          <Row gutter={[24, 24]}>
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <Col key={b.title} xs={24} sm={12} lg={6}>
                  <div className="why-card">
                    <div
                      className="why-icon-wrap"
                      style={{ background: `${b.color}14`, border: `1px solid ${b.color}30` }}
                    >
                      <Icon style={{ fontSize: 28, color: b.color }} />
                    </div>

                    <div className="why-card-title">
                      {b.title}
                    </div>
                    <div className="why-card-title-en">
                      {b.titleEn}
                    </div>
                    <Text className="why-card-desc">
                      {b.desc}
                    </Text>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>
    </ConfigProvider>
    </StyleProvider>
  );
}

