import { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  Space,
  Typography,
  Alert,
  Tag,
  Empty,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { IncidentType } from '../../lib/forms';
import type { Dayjs } from 'dayjs';

const { Text } = Typography;

// ── IDR helpers ───────────────────────────────────────────────────────────────

const idrFormatter = (v?: string | number) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const idrParser = (v?: string) => Number((v ?? '').replace(/\./g, '')) as unknown as number;

// ── Options ───────────────────────────────────────────────────────────────────

const INCIDENT_TYPE_OPTIONS: { label: string; value: IncidentType; color: string }[] = [
  { label: 'Kerusakan', value: 'Kerusakan', color: 'warning' },
  { label: 'Kehilangan', value: 'Kehilangan', color: 'error' },
];

// Suggested values for "room / equipment involved" — free-text input + suggestions
const INVOLVED_SUGGESTIONS = [
  'Studio A',
  'Studio B',
  'Carbon (Function Room)',
  'Ruang Meeting',
  'Kamera DSLR',
  'Tripod',
  'Lighting Set',
  'Proyektor',
  'Microphone',
  'Backdrop',
  'Meja',
  'Kursi',
  'AC Unit',
  'Lainnya',
];

// ── Individual incident card ──────────────────────────────────────────────────

interface IncidentCardProps {
  name: number;
  onRemove: () => void;
  index: number;
}

function IncidentCard({ name, onRemove, index }: IncidentCardProps) {
  return (
    <Card
      size="small"
      style={{ borderRadius: 10, marginBottom: 12, borderLeft: '3px solid #f59e0b' }}
      title={
        <Space>
          <WarningOutlined style={{ color: '#f59e0b' }} />
          <Text style={{ fontSize: 13 }}>Insiden #{index + 1}</Text>
        </Space>
      }
      extra={
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={onRemove}
        >
          Hapus
        </Button>
      }
    >
      <Row gutter={[12, 0]}>
        {/* Date */}
        <Col xs={24} sm={8} md={6}>
          <Form.Item
            name={[name, 'date']}
            label="Tanggal Kejadian"
            rules={[{ required: true, message: 'Wajib diisi' }]}
            style={{ marginBottom: 12 }}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Pilih tanggal" />
          </Form.Item>
        </Col>

        {/* Type */}
        <Col xs={24} sm={8} md={5}>
          <Form.Item
            name={[name, 'type']}
            label="Tipe Insiden"
            rules={[{ required: true, message: 'Wajib diisi' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              placeholder="Pilih tipe"
              options={INCIDENT_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: <Tag color={o.color} style={{ margin: 0 }}>{o.label}</Tag>,
              }))}
            />
          </Form.Item>
        </Col>

        {/* Involved room / equipment */}
        <Col xs={24} sm={8} md={7}>
          <Form.Item
            name={[name, 'involved']}
            label="Ruangan / Barang Terlibat"
            rules={[{ required: true, message: 'Wajib diisi' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              showSearch
              mode="tags"
              placeholder="Pilih atau ketik nama ruangan / barang"
              options={INVOLVED_SUGGESTIONS.map((s) => ({ value: s, label: s }))}
              maxTagCount={2}
            />
          </Form.Item>
        </Col>

        {/* Estimated cost */}
        <Col xs={24} sm={8} md={6}>
          <Form.Item
            name={[name, 'estimated_cost']}
            label="Estimasi Kerugian (Rp)"
            tooltip="Opsional — isi jika ada perkiraan biaya penggantian / perbaikan"
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              min={0}
              step={50000}
              style={{ width: '100%' }}
              formatter={idrFormatter}
              parser={idrParser}
              placeholder="0 (opsional)"
            />
          </Form.Item>
        </Col>

        {/* Description */}
        <Col xs={24}>
          <Form.Item
            name={[name, 'description']}
            label="Kronologi / Deskripsi"
            rules={[{ required: true, message: 'Wajib diisi' }]}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea
              rows={3}
              placeholder="Jelaskan kronologi kejadian, penyebab, dampak, dan tindakan yang sudah diambil..."
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BookingIncidentTabProps {
  bookingId: number;
}

interface IncidentRowValues {
  date?: Dayjs;
  type: IncidentType;
  involved: string[];
  description: string;
  estimated_cost?: number;
}

interface IncidentFormValues {
  entries: IncidentRowValues[];
}

export default function BookingIncidentTab({ bookingId }: BookingIncidentTabProps) {
  const [form] = Form.useForm<IncidentFormValues>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    let values: IncidentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      // TODO: wire to POST/PUT /api/bookings/:id/incidents
      // Serialise dayjs date fields before sending:
      // values.entries.map(e => ({ ...e, date: e.date?.format('YYYY-MM-DD') }))
      console.debug('[Form D] Incident data for booking', bookingId, values);
      await new Promise((r) => setTimeout(r, 400));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" initialValues={{ entries: [] }}>
      <Form.List name="entries">
        {(fields, { add, remove }) => (
          <>
            {fields.length === 0 && (
              <Empty
                image={<WarningOutlined style={{ fontSize: 40, color: '#d1d5db' }} />}
                imageStyle={{ height: 48 }}
                description={
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Tidak ada insiden yang dilaporkan.
                    Klik "Tambah Insiden" jika ada kerusakan atau kehilangan barang.
                  </Text>
                }
                style={{ margin: '24px 0' }}
              />
            )}

            {fields.map(({ key, name }, index) => (
              <IncidentCard
                key={key}
                name={name}
                index={index}
                onRemove={() => remove(name)}
              />
            ))}

            <Button
              type="dashed"
              danger
              onClick={() => add()}
              icon={<PlusOutlined />}
              style={{ width: '100%', marginBottom: 4 }}
            >
              Tambah Insiden
            </Button>
          </>
        )}
      </Form.List>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16 }}>
        {saved && (
          <Alert type="success" message="Laporan insiden disimpan." showIcon style={{ padding: '4px 12px' }} />
        )}
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Simpan Laporan Insiden
        </Button>
      </div>
    </Form>
  );
}
