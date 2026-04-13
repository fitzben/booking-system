import { useState, useEffect, useMemo } from 'react';
import { Form, Input, InputNumber, Select, Switch, Divider, DatePicker, Upload } from 'antd';
import { PictureOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { Room } from '../../lib/api';
import { ADMIN_PASSWORD_KEY, ADMIN_USERNAME_KEY } from '../../lib/constants';

// ── Constants ─────────────────────────────────────────────────────────────────

export const INVENTORY_CATEGORIES = [
  'Lighting',
  'Audio',
  'Camera',
  'Grip',
  'Furniture',
  'Misc',
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export interface InventoryFormValues {
  name: string;
  category: string;
  code: string;
  brand: string;
  model: string;
  default_room_id: number | null;
  is_fixed: boolean;
  quantity_total: number;
  quantity_damaged: number;
  quantity_in_use: number;
  notes: string;
  // extras (migration 010) — date fields store Dayjs internally; formatted to string on save
  photo_url?: string | null;
  photo_key?: string | null;
  service_date?: Dayjs | null;
  warranty_date?: Dayjs | null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface InventoryFormProps {
  rooms: Pick<Room, 'id' | 'name'>[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryForm({ rooms }: InventoryFormProps) {
  const form = Form.useFormInstance<InventoryFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Warranty date watch for label colour
  const warrantyDate = Form.useWatch('warranty_date', form) as Dayjs | null | undefined;

  const warrantyLabelStyle = useMemo(() => {
    if (!warrantyDate) return undefined;
    const daysLeft = warrantyDate.diff(dayjs(), 'day');
    if (daysLeft <= 7) return { color: '#dc2626', fontWeight: 600 };
    if (daysLeft <= 30) return { color: '#d97706', fontWeight: 600 };
    return undefined;
  }, [warrantyDate]);

  // Initialise fileList from existing photo on mount (edit mode via destroyOnClose)
  useEffect(() => {
    const url = form.getFieldValue('photo_url') as string | null | undefined;
    if (url) {
      setFileList([{ uid: '-1', name: 'foto-item', status: 'done', url, thumbUrl: url }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Photo upload via S3-compatible /api/inventory/upload-photo ─────────────

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const username = localStorage.getItem(ADMIN_USERNAME_KEY) ?? '';
      const password = localStorage.getItem(ADMIN_PASSWORD_KEY) ?? '';
      const fd = new FormData();
      fd.append('file', file as File);
      const res = await fetch('/api/inventory/upload-photo', {
        method: 'POST',
        headers: { 'x-admin-username': username, 'x-admin-password': password },
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((body.error as string | undefined) ?? `Upload failed (${res.status})`);
      }
      const data = await res.json() as { photo_url: string; photo_key: string };
      form.setFieldsValue({ photo_url: data.photo_url, photo_key: data.photo_key });
      onSuccess?.(data);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove: UploadProps['onRemove'] = async () => {
    const key = form.getFieldValue('photo_key') as string | null | undefined;
    if (key) {
      const username = localStorage.getItem(ADMIN_USERNAME_KEY) ?? '';
      const password = localStorage.getItem(ADMIN_PASSWORD_KEY) ?? '';
      await fetch('/api/inventory/upload-photo', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-username': username,
          'x-admin-password': password,
        },
        body: JSON.stringify({ photo_key: key }),
      }).catch(() => undefined);
    }
    form.setFieldsValue({ photo_url: null, photo_key: null });
    setFileList([]);
    return true;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Basic info ──────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#9ca3af', marginTop: 0 }}>
        Informasi Dasar
      </Divider>

      <Form.Item
        name="name"
        label="Nama Item"
        rules={[{ required: true, message: 'Nama wajib diisi' }]}
      >
        <Input placeholder="e.g. Kamera DSLR Canon 5D" />
      </Form.Item>

      <Form.Item
        name="category"
        label="Kategori"
        rules={[{ required: true, message: 'Kategori wajib dipilih' }]}
      >
        <Select
          placeholder="Pilih kategori"
          options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </Form.Item>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Form.Item name="brand" label="Brand">
          <Input placeholder="e.g. Canon" />
        </Form.Item>
        <Form.Item name="model" label="Model">
          <Input placeholder="e.g. EOS 5D Mark IV" />
        </Form.Item>
      </div>

      <Form.Item name="code" label="Kode Aset" tooltip="Opsional — ID internal atau nomor aset">
        <Input placeholder="e.g. CAM-001" />
      </Form.Item>

      {/* ── Location ────────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#9ca3af' }}>
        Lokasi & Mobilitas
      </Divider>

      <Form.Item name="default_room_id" label="Ruangan Default" tooltip="Ruangan tempat item biasanya disimpan">
        <Select
          placeholder="Pilih ruangan (opsional)"
          allowClear
          options={[
            { value: null, label: '— Tidak ada —' },
            ...rooms.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
      </Form.Item>

      <Form.Item name="is_fixed" label="Item Tetap (Fixed)" valuePropName="checked">
        <Switch checkedChildren="Tetap" unCheckedChildren="Dapat Dipindah" />
      </Form.Item>

      {/* ── Quantities ──────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#9ca3af' }}>
        Kuantitas
      </Divider>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
        <Form.Item
          name="quantity_total"
          label="Total Unit"
          rules={[{ required: true, message: 'Wajib diisi' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="quantity_damaged" label="Rusak">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="quantity_in_use" label="Sedang Digunakan">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#9ca3af' }}>
        Catatan
      </Divider>

      <Form.Item name="notes" style={{ marginBottom: 0 }}>
        <Input.TextArea
          rows={3}
          placeholder="Kondisi khusus, lokasi penyimpanan, tanggal pembelian, dll."
        />
      </Form.Item>

      {/* ── Aset & Garansi ──────────────────────────────────────────────── */}
      <Divider titlePlacement="start" style={{ fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
        Aset & Garansi
      </Divider>

      {/* Hidden fields for photo metadata */}
      <Form.Item name="photo_url" hidden><Input /></Form.Item>
      <Form.Item name="photo_key" hidden><Input /></Form.Item>

      {/* Photo upload */}
      <Form.Item
        label={
          <span>
            <PictureOutlined style={{ marginRight: 6 }} />
            Foto Item
          </span>
        }
        tooltip="Upload foto aset (JPG, PNG, atau WebP). Foto lama akan dihapus saat diganti."
      >
        <Upload
          listType="picture-card"
          fileList={fileList}
          maxCount={1}
          accept="image/jpeg,image/png,image/gif,image/webp"
          customRequest={customRequest}
          onChange={({ fileList: fl }) => setFileList(fl)}
          onRemove={handleRemove}
          disabled={uploading}
        >
          {fileList.length < 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <UploadOutlined style={{ fontSize: 18 }} />
              <span style={{ fontSize: 12 }}>Upload</span>
            </div>
          )}
        </Upload>
      </Form.Item>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Form.Item
          name="service_date"
          label="Tanggal Masuk Servis"
          tooltip="Tanggal item terakhir / sedang masuk servis"
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Pilih tanggal" />
        </Form.Item>

        <Form.Item
          name="warranty_date"
          label={<span style={warrantyLabelStyle}>Tanggal Garansi Berakhir</span>}
          tooltip="Garansi akan disorot merah jika ≤7 hari, kuning jika ≤30 hari"
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Pilih tanggal" />
        </Form.Item>
      </div>
    </>
  );
}
