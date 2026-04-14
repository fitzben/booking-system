import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Space,
  Spin,
  Table,
  Typography,
  Popconfirm,
} from 'antd';
import {
  DeleteOutlined,
  FileAddOutlined,
  LinkOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { getBookingDocuments, uploadBookingDocument, deleteBookingDocument } from '../../lib/api';

const { Text } = Typography;

interface Props {
  bookingId: number;
}

export default function BookingDocumentsTab({ bookingId }: Props) {
  const [docs, setDocs] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload form state
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Open state
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBookingDocuments(bookingId);
        setDocs(data);
      } catch (err: unknown) {
        setError((err as Error).message ?? 'Gagal memuat dokumen.');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleUpload = async () => {
    if (!label.trim()) { setUploadError('Label wajib diisi.'); return; }
    if (!file) { setUploadError('Pilih file terlebih dahulu.'); return; }

    setUploading(true);
    setUploadError('');
    try {
      const doc = await uploadBookingDocument(bookingId, label.trim(), file);
      setDocs((prev) => [...prev, doc]);
      setLabel('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      setUploadError((err as Error).message ?? 'Upload gagal.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteBookingDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Gagal menghapus dokumen.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpen = async (doc: BookingDocument) => {
    setOpeningId(doc.id);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`);
      if (!res.ok) { setError('Gagal membuka dokumen.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setError('Gagal membuka dokumen.');
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {error && <Alert type="error" message={error} showIcon />}

      {/* Document list */}
      <Table<BookingDocument>
        dataSource={docs}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'Belum ada dokumen yang diupload.' }}
        columns={[
          {
            title: 'Label',
            dataIndex: 'label',
            key: 'label',
            render: (val: string) => <Text strong>{val}</Text>,
          },
          {
            title: 'File',
            key: 'file',
            render: (_: unknown, record: BookingDocument) => (
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                loading={openingId === record.id}
                onClick={() => handleOpen(record)}
                style={{ padding: 0 }}
              >
                Buka
              </Button>
            ),
          },
          {
            title: 'Diupload',
            dataIndex: 'uploaded_at',
            key: 'uploaded_at',
            render: (val: string) => (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {val.replace('T', ' ').slice(0, 16)}
              </Text>
            ),
          },
          {
            title: '',
            key: 'actions',
            width: 60,
            render: (_: unknown, record: BookingDocument) => (
              <Popconfirm
                title="Hapus dokumen ini?"
                okText="Hapus"
                cancelText="Batal"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(record.id)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  loading={deletingId === record.id}
                />
              </Popconfirm>
            ),
          },
        ]}
      />

      {/* Upload form */}
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: '16px 20px',
        }}
      >
        <Space style={{ marginBottom: 12 }}>
          <FileAddOutlined style={{ color: '#6b7280' }} />
          <Text style={{ fontSize: 13, fontWeight: 600 }}>Upload Dokumen Baru</Text>
        </Space>

        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Input
            placeholder="Label dokumen (contoh: KTP, NPWP, Surat Izin)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ maxWidth: 380 }}
          />

          <Space align="center" wrap>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              style={{ fontSize: 13 }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </Text>
            )}
          </Space>

          {uploadError && (
            <Alert type="error" message={uploadError} showIcon style={{ padding: '4px 12px' }} />
          )}

          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={handleUpload}
            disabled={!label.trim() || !file}
          >
            Upload
          </Button>
        </Space>
      </div>
    </Space>
  );
}
