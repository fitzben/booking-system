import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Divider,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { ROOM_TYPE_OPTIONS } from '../../lib/constants';
import type { Room, RoomPricingTier } from '../../lib/api';

const { Text } = Typography;

// ── IDR formatting helpers ────────────────────────────────────────────────────

const idrFormatter = (v?: string | number) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const idrParser = (v?: string) => Number((v ?? '').replace(/\./g, '')) as unknown as number;

// ── Conversion helpers (used by AdminRoomsPage before calling the API) ────────

/** array → comma-separated display string */
export function arrayToRaw(arr?: string[]): string {
  return (arr ?? []).join(', ');
}

/** comma/newline-separated string → trimmed string[] */
export function rawToArray(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** newline-separated URLs → string[] */
export function rawToLines(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Form value shape (internal to the form) ──────────────────────────────────

export interface RoomFormValues {
  // Basic
  name: string;
  type: string;
  base_price: number | null;
  notes: string;
  capacity: string;
  // Description
  short_description: string;
  // Lists
  facilities_raw: string;     // comma-separated → string[]
  equipment_raw: string;      // comma-separated → string[]
  // Default equipment (structured, for booking pre-population)
  default_equipment: { name: string; quantity: number }[];
  // Pricing
  tiers: { hours: number; price: number }[];
  overtime_rate: number;
}

/** Map a Room (from API) into the form's internal values. */
export function roomToFormValues(
  room: Room,
  tiers: Pick<RoomPricingTier, 'hours' | 'price'>[],
): RoomFormValues {
  return {
    name: room.name,
    type: room.type,
    base_price: room.base_price ?? null,
    notes: room.notes ?? '',
    capacity: room.capacity ?? '',
    short_description: room.short_description ?? '',
    facilities_raw: arrayToRaw(room.facilities),
    equipment_raw: arrayToRaw(room.equipment_highlights),
    default_equipment: room.default_equipment ?? [],
    tiers: tiers.map((t) => ({ hours: t.hours, price: t.price })),
    overtime_rate: room.overtime_rate ?? 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RoomFormProps {
  form: FormInstance<RoomFormValues>;
  tiersLoading?: boolean;
}

export default function RoomForm({ form, tiersLoading = false }: RoomFormProps) {
  return (
    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
      {/* ── Basic info ──────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#6b7280' }}>
        Informasi Dasar
      </Divider>

      <Form.Item
        name="name"
        label="Nama Ruangan"
        rules={[{ required: true, message: 'Nama ruangan wajib diisi' }]}
      >
        <Input placeholder="Contoh: Studio A, Carbon Room" />
      </Form.Item>

      <Form.Item
        name="type"
        label="Tipe Ruangan"
        rules={[{ required: true, message: 'Tipe wajib dipilih' }]}
      >
        <Select
          placeholder="Pilih tipe"
          options={ROOM_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Form.Item>

      <div style={{ display: 'flex', gap: 12 }}>
        <Form.Item
          name="base_price"
          label="Harga Dasar (Rp)"
          tooltip="Opsional — kosongkan jika harga belum ditentukan, akan tampil 'Hubungi Admin' di halaman publik"
          style={{ flex: 1 }}
        >
          <InputNumber
            min={0}
            step={50000}
            style={{ width: '100%' }}
            formatter={idrFormatter}
            parser={idrParser}
            placeholder="Kosongkan jika belum ditentukan"
          />
        </Form.Item>

        <Form.Item
          name="capacity"
          label="Kapasitas"
          style={{ flex: 1 }}
          tooltip="Contoh: Maks. 20 orang / crew"
        >
          <Input placeholder="Maks. 20 orang / crew" />
        </Form.Item>
      </div>

      <Form.Item name="notes" label="Catatan Internal (opsional)">
        <Input.TextArea rows={2} placeholder="Catatan untuk tim admin" />
      </Form.Item>

      {/* ── Description ────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#6b7280' }}>
        Deskripsi
      </Divider>

      <Form.Item
        name="short_description"
        label="Deskripsi Singkat"
        tooltip="1–3 kalimat yang ditampilkan di drawer detail ruangan"
      >
        <Input.TextArea
          rows={3}
          placeholder="Deskripsi singkat ruangan untuk landing page publik..."
        />
      </Form.Item>

      {/* ── Facilities & equipment ──────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#6b7280' }}>
        Fasilitas &amp; Equipment
      </Divider>

      <Form.Item
        name="facilities_raw"
        label="Fasilitas (pisahkan dengan koma)"
        tooltip="Ditampilkan sebagai bullet list di landing page"
      >
        <Input.TextArea
          rows={3}
          placeholder="AC, WiFi, Sound System, Proyektor, ..."
        />
      </Form.Item>

      <Form.Item
        name="equipment_raw"
        label="Equipment Highlights (pisahkan dengan koma)"
        tooltip="Ditampilkan di bagian Equipment pada detail ruangan publik"
      >
        <Input.TextArea
          rows={3}
          placeholder="Kamera & tripod, Lighting set, Monitor preview 32&quot;, ..."
        />
      </Form.Item>

      {/* ── Default Equipment (structured, for booking pre-population) ── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#6b7280' }}>
        Default Equipment Booking
      </Divider>

      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        Daftar equipment bawaan ruangan ini. Akan otomatis muncul sebagai baris pre-filled saat admin membuka Tab Equipment Usage pada booking ruangan ini.
      </Text>

      <Form.List name="default_equipment">
        {(fields, { add, remove }) => (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {fields.map(({ key, name }) => (
              <Space key={key} align="baseline" style={{ width: '100%' }}>
                <Form.Item
                  name={[name, 'name']}
                  rules={[{ required: true, message: 'Wajib' }]}
                  style={{ marginBottom: 0, flex: 1, minWidth: 200 }}
                >
                  <Input placeholder="Nama equipment (misal: Tripod, Lighting Set)" />
                </Form.Item>
                <Form.Item
                  name={[name, 'quantity']}
                  style={{ marginBottom: 0 }}
                  initialValue={1}
                >
                  <InputNumber min={1} addonAfter="pcs" style={{ width: 110 }} placeholder="1" />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => remove(name)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              onClick={() => add({ name: '', quantity: 1 })}
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Tambah Equipment Default
            </Button>
          </Space>
        )}
      </Form.List>

      {/* ── Pricing tiers ──────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#6b7280' }}>
        Pricing Tiers
      </Divider>

      <Form.List name="tiers">
        {(fields, { add, remove }) => (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {tiersLoading ? (
              <Text type="secondary" style={{ fontSize: 13 }}>Memuat tier...</Text>
            ) : (
              <>
                {fields.map(({ key, name }) => (
                  <Space key={key} align="baseline" style={{ width: '100%' }}>
                    <Form.Item
                      name={[name, 'hours']}
                      rules={[{ required: true, message: 'Wajib' }]}
                      style={{ marginBottom: 0, width: 100 }}
                    >
                      <InputNumber
                        min={1}
                        addonAfter="jam"
                        placeholder="3"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[name, 'price']}
                      rules={[{ required: true, message: 'Wajib' }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <InputNumber
                        min={0}
                        step={50000}
                        addonBefore="Rp"
                        style={{ width: '100%' }}
                        formatter={idrFormatter}
                        parser={idrParser}
                        placeholder="500.000"
                      />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  style={{ width: '100%' }}
                >
                  Tambah Tier
                </Button>
              </>
            )}
          </Space>
        )}
      </Form.List>

      {/* ── Overtime ────────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#6b7280' }}>
        Overtime
      </Divider>

      <Form.Item
        name="overtime_rate"
        label="Biaya Overtime (Rp/jam)"
        tooltip="Per jam untuk durasi melebihi tier yang matched"
        initialValue={0}
      >
        <InputNumber
          min={0}
          step={25000}
          style={{ width: '100%' }}
          addonBefore="Rp"
          addonAfter="/jam"
          formatter={idrFormatter}
          parser={idrParser}
          placeholder="0"
        />
      </Form.Item>
    </Form>
  );
}
