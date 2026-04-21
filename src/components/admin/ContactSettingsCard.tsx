import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Divider, message } from 'antd';
import {
  WhatsAppOutlined,
  MailOutlined,
  LinkOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { getSetting, setSetting } from '../../lib/api';

const CONTACT_KEYS = [
  'contact_whatsapp',
  'contact_wa_template',
  'contact_email',
  'contact_address',
  'contact_gmaps',
  'contact_hours',
] as const;

export default function ContactSettingsCard() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messageApi, ctx] = message.useMessage();

  useEffect(() => {
    (async () => {
      try {
        const entries = await Promise.all(CONTACT_KEYS.map((k) => getSetting(k)));
        const values: Record<string, string> = {};
        entries.forEach(({ key, value }) => {
          if (value != null) values[key] = value;
        });
        form.setFieldsValue(values);
      } catch {
        messageApi.error('Gagal memuat pengaturan kontak.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      await Promise.all(CONTACT_KEYS.map((k) => setSetting(k, values[k] ?? '')));
      messageApi.success('Pengaturan kontak berhasil disimpan.');
    } catch {
      messageApi.error('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Informasi Kontak & Operasional" style={{ borderRadius: 12 }} loading={loading}>
      {ctx}
      <Form form={form} layout="vertical">

        <Divider titlePlacement="left" orientationMargin={0} style={{ fontSize: 12, color: '#9ca3af' }}>
          WhatsApp
        </Divider>

        <Form.Item
          name="contact_whatsapp"
          label="Nomor WhatsApp"
          tooltip="Format: 62xxxxxxxxxx (tanpa + dan spasi)"
          rules={[{ required: true, message: 'Nomor WA wajib diisi' }]}
        >
          <Input
            prefix={<WhatsAppOutlined style={{ color: '#25d366' }} />}
            placeholder="6281393098189"
          />
        </Form.Item>

        <Form.Item
          name="contact_wa_template"
          label="Template Pesan WhatsApp"
          tooltip="Pesan default yang muncul saat user klik tombol Chat via WhatsApp"
        >
          <Input.TextArea
            rows={3}
            placeholder="Halo, saya ingin menanyakan informasi peminjaman ruangan."
          />
        </Form.Item>

        <Divider titlePlacement="left" orientationMargin={0} style={{ fontSize: 12, color: '#9ca3af' }}>
          Kontak Lainnya
        </Divider>

        <Form.Item name="contact_email" label="Email">
          <Input
            prefix={<MailOutlined />}
            placeholder="info@mdentertainment.id"
            type="email"
          />
        </Form.Item>

        <Form.Item name="contact_address" label="Alamat">
          <Input.TextArea
            rows={2}
            placeholder="Jl. Nama Jalan No. 123, Jakarta"
          />
        </Form.Item>

        <Form.Item
          name="contact_gmaps"
          label="Link Google Maps"
          tooltip="Paste full URL dari Google Maps"
        >
          <Input
            prefix={<LinkOutlined />}
            placeholder="https://maps.google.com/?q=..."
          />
        </Form.Item>

        <Divider titlePlacement="left" orientationMargin={0} style={{ fontSize: 12, color: '#9ca3af' }}>
          Jam Operasional
        </Divider>

        <Form.Item
          name="contact_hours"
          label="Jam Operasional"
          tooltip="Tiap baris = satu hari/range. Contoh: Senin – Jumat: 09.00 – 18.00"
        >
          <Input.TextArea
            rows={4}
            placeholder={'Senin – Jumat: 09.00 – 18.00\nSabtu: 09.00 – 15.00\nMinggu: Tutup'}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Simpan Pengaturan Kontak
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
