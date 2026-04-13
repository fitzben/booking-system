import { Modal, Typography, Divider, Space, Button } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  TeamOutlined,
  ToolOutlined,
  DollarOutlined,
  StopOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const SECTIONS = [
  {
    icon: <CheckCircleOutlined />,
    color: '#059669',
    title: 'Persetujuan & Administrasi',
    points: [
      'Penggunaan studio telah mendapat persetujuan resmi.',
      'Seluruh dokumen dan formulir penggunaan telah dilengkapi.',
    ],
  },
  {
    icon: <TeamOutlined />,
    color: '#2563eb',
    title: 'Penanggung Jawab (PIC)',
    points: [
      'Menunjuk 1 PIC yang bertanggung jawab penuh atas seluruh aktivitas, fasilitas, dan kondisi studio selama penggunaan.',
    ],
  },
  {
    icon: <ToolOutlined />,
    color: '#d97706',
    title: 'Penggunaan Fasilitas & Equipment',
    points: [
      'Seluruh penggunaan equipment wajib dicatat.',
      'Dilarang mengambil atau memindahkan equipment tanpa izin.',
    ],
  },
  {
    icon: <CheckCircleOutlined />,
    color: '#059669',
    title: 'Kondisi Studio',
    points: [
      'Wajib menjaga kebersihan, merapikan, dan mengembalikan studio ke kondisi semula setelah penggunaan.',
      'Seluruh barang pribadi wajib dikeluarkan setelah kegiatan selesai.',
    ],
  },
  {
    icon: <WarningOutlined />,
    color: '#dc2626',
    title: 'Kerusakan & Kehilangan',
    points: [
      'Pengguna bertanggung jawab penuh atas segala kerusakan atau kehilangan.',
      'Bersedia mengganti kerugian sesuai ketentuan yang berlaku.',
    ],
  },
  {
    icon: <StopOutlined />,
    color: '#dc2626',
    title: 'Larangan',
    points: [
      'Dilarang menggunakan studio tanpa izin.',
      'Dilarang merokok/vape, membawa barang berbahaya, atau melakukan aktivitas ilegal.',
      'Dilarang meninggalkan studio dalam kondisi tidak layak.',
    ],
  },
  {
    icon: <DollarOutlined />,
    color: '#d97706',
    title: 'Pembayaran',
    points: [
      'Bersedia mengikuti ketentuan tarif dan pembayaran sesuai kebijakan yang berlaku.',
    ],
  },
  {
    icon: <WarningOutlined />,
    color: '#dc2626',
    title: 'Sanksi',
    points: [
      'Pelanggaran dapat mengakibatkan penghentian penggunaan, kewajiban ganti rugi, dan/atau tindakan hukum.',
    ],
  },
];

export default function TermsModal({ open, onClose, onAgree }: TermsModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#d97706',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <span style={{ fontWeight: 700 }}>Syarat & Ketentuan Penggunaan Studio</span>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Tutup</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => { onAgree(); onClose(); }}
            style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 600 }}
          >
            Saya Setuju & Tutup
          </Button>
        </div>
      }
      width="min(680px, calc(100vw - 32px))"
      styles={{
        body: {
          maxHeight: '60vh',
          overflowY: 'auto',
          padding: '16px 24px',
        },
      }}
    >
      {/* Intro */}
      <div style={{
        background: '#fffbf0',
        border: '1px solid #fde68a',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 13, color: '#92400e' }}>
          Dengan menyetujui ini, pengguna menyatakan telah membaca, memahami,
          dan bersedia bertanggung jawab penuh atas aktivitas, penggunaan
          fasilitas, dan segala risiko yang timbul selama penggunaan studio.
        </Text>
      </div>

      {/* Sections */}
      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        {SECTIONS.map((section, i) => (
          <div key={i}>
            {i > 0 && <Divider style={{ margin: '12px 0' }} />}
            <Space align="start" style={{ width: '100%' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: `${section.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: section.color, fontSize: 14,
              }}>
                {section.icon}
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {section.title}
                </Text>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {section.points.map((point, j) => (
                    <li key={j}>
                      <Text style={{ fontSize: 13, color: '#374151' }}>{point}</Text>
                    </li>
                  ))}
                </ul>
              </div>
            </Space>
          </div>
        ))}
      </Space>

      {/* Footer note */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '10px 14px',
        marginTop: 20,
      }}>
        <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
          Seluruh Syarat dan Ketentuan secara lengkap tercantum dalam SOP yang berlaku.
        </Text>
      </div>
    </Modal>
  );
}
