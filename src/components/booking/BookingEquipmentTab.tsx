import { useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Select,
  TimePicker,
  Button,
  Space,
  Typography,
  Alert,
  Tag,
  Empty,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { EquipmentCondition } from '../../lib/forms';

const { Text } = Typography;

// ── Mock equipment list ───────────────────────────────────────────────────────
// TODO: replace with real equipment master data from API

const EQUIPMENT_OPTIONS = [
  'Kamera DSLR Canon 5D',
  'Kamera DSLR Nikon D850',
  'Tripod Heavy-Duty',
  'Lighting LED Panel (Set)',
  'Reflektor 5-in-1',
  'Softbox 60×90cm',
  'Backdrop Putih',
  'Backdrop Hitam',
  'Microphone Boom',
  'Wireless Microphone',
  'Sound Mixer',
  'Monitor Preview 32"',
  'HDMI Cable (5m)',
  'Extension Cord (10m)',
  'Proyektor',
  'Layar Proyektor',
  'Whiteboard',
  'AC Remote',
];

const CONDITION_OPTIONS: { label: string; value: EquipmentCondition; color: string }[] = [
  { label: 'Baik', value: 'Baik', color: 'success' },
  { label: 'Ada Cacat Minor', value: 'Ada Cacat Minor', color: 'warning' },
  { label: 'Rusak', value: 'Rusak', color: 'error' },
];

// ── Condition tag renderer ────────────────────────────────────────────────────

function ConditionSelect({ value, onChange }: { value?: EquipmentCondition; onChange?: (v: EquipmentCondition) => void }) {
  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder="Kondisi"
      style={{ width: '100%', minWidth: 140 }}
      options={CONDITION_OPTIONS.map((o) => ({
        value: o.value,
        label: <Tag color={o.color} style={{ margin: 0 }}>{o.label}</Tag>,
      }))}
    />
  );
}

// ── Row header labels ─────────────────────────────────────────────────────────

const HEADER_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

// ── Main component ────────────────────────────────────────────────────────────

interface BookingEquipmentTabProps {
  bookingId: number;
}

interface EquipmentRowValues {
  equipment: string;
  quantity: number;
  time_out?: unknown;   // Dayjs from TimePicker
  time_in?: unknown;
  condition_out: EquipmentCondition;
  condition_in: EquipmentCondition;
  notes?: string;
}

interface EquipmentFormValues {
  entries: EquipmentRowValues[];
}

export default function BookingEquipmentTab({ bookingId }: BookingEquipmentTabProps) {
  const [form] = Form.useForm<EquipmentFormValues>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    let values: EquipmentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      // TODO: wire to POST/PUT /api/bookings/:id/equipment-log
      // Serialise dayjs time fields before sending
      console.debug('[Form C] Equipment log for booking', bookingId, values);
      await new Promise((r) => setTimeout(r, 400));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" initialValues={{ entries: [] }}>
      {/* Column header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 70px 100px 100px 160px 160px 1fr 32px',
          gap: 8,
          padding: '0 4px 8px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: 4,
        }}
      >
        <span style={HEADER_STYLE}>Equipment</span>
        <span style={HEADER_STYLE}>Qty</span>
        <span style={HEADER_STYLE}>Time Out</span>
        <span style={HEADER_STYLE}>Time In</span>
        <span style={HEADER_STYLE}>Kondisi Out</span>
        <span style={HEADER_STYLE}>Kondisi In</span>
        <span style={HEADER_STYLE}>Catatan</span>
        <span />
      </div>

      <Form.List name="entries">
        {(fields, { add, remove }) => (
          <>
            {fields.length === 0 && (
              <Empty
                image={<ToolOutlined style={{ fontSize: 40, color: '#d1d5db' }} />}
                imageStyle={{ height: 48 }}
                description={
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Belum ada equipment yang dicatat. Klik "Tambah Equipment" untuk mulai.
                  </Text>
                }
                style={{ margin: '24px 0' }}
              />
            )}

            {fields.map(({ key, name }) => (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 70px 100px 100px 160px 160px 1fr 32px',
                  gap: 8,
                  alignItems: 'flex-start',
                  padding: '8px 4px',
                  borderBottom: '1px solid #f9f9f9',
                }}
              >
                {/* Equipment name */}
                <Form.Item
                  name={[name, 'equipment']}
                  style={{ marginBottom: 0 }}
                  rules={[{ required: true, message: 'Wajib' }]}
                >
                  <Select
                    showSearch
                    placeholder="Nama equipment"
                    optionFilterProp="label"
                    options={EQUIPMENT_OPTIONS.map((e) => ({ value: e, label: e }))}
                    dropdownStyle={{ minWidth: 260 }}
                  />
                </Form.Item>

                {/* Quantity */}
                <Form.Item
                  name={[name, 'quantity']}
                  style={{ marginBottom: 0 }}
                  initialValue={1}
                  rules={[{ required: true, message: '' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>

                {/* Time out */}
                <Form.Item name={[name, 'time_out']} style={{ marginBottom: 0 }}>
                  <TimePicker format="HH:mm" placeholder="Keluar" minuteStep={5} style={{ width: '100%' }} />
                </Form.Item>

                {/* Time in */}
                <Form.Item name={[name, 'time_in']} style={{ marginBottom: 0 }}>
                  <TimePicker format="HH:mm" placeholder="Kembali" minuteStep={5} style={{ width: '100%' }} />
                </Form.Item>

                {/* Condition out */}
                <Form.Item
                  name={[name, 'condition_out']}
                  style={{ marginBottom: 0 }}
                  initialValue="Baik"
                  rules={[{ required: true, message: '' }]}
                >
                  <ConditionSelect />
                </Form.Item>

                {/* Condition in */}
                <Form.Item
                  name={[name, 'condition_in']}
                  style={{ marginBottom: 0 }}
                  initialValue="Baik"
                  rules={[{ required: true, message: '' }]}
                >
                  <ConditionSelect />
                </Form.Item>

                {/* Notes */}
                <Form.Item name={[name, 'notes']} style={{ marginBottom: 0 }}>
                  <Input placeholder="Catatan..." />
                </Form.Item>

                {/* Remove */}
                <Tooltip title="Hapus baris">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    style={{ marginTop: 4 }}
                  />
                </Tooltip>
              </div>
            ))}

            <Button
              type="dashed"
              onClick={() => add()}
              icon={<PlusOutlined />}
              style={{ width: '100%', marginTop: 12 }}
            >
              Tambah Equipment
            </Button>
          </>
        )}
      </Form.List>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 20 }}>
        {saved && (
          <Alert type="success" message="Log equipment disimpan." showIcon style={{ padding: '4px 12px' }} />
        )}
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Simpan Log Equipment
        </Button>
      </div>
    </Form>
  );
}
