import React, { useEffect, useState } from 'react';
import {
  Card, Table, Select, Button, Space, Typography,
  Tag, Alert, message, Popconfirm, Tooltip,
} from 'antd';
import { SaveOutlined, ReloadOutlined, LockOutlined } from '@ant-design/icons';
import { getRolePermissions, updateRolePermissions } from '../../lib/api';
import { ROLE_LABELS, ADMIN_ROLE_KEY } from '../../lib/constants';

const { Text } = Typography;

const RESOURCES = [
  { key: 'bookings',  label: 'Bookings'   },
  { key: 'rooms',     label: 'Ruangan'    },
  { key: 'inventory', label: 'Inventaris' },
  { key: 'users',     label: 'Users'      },
  { key: 'reports',   label: 'Laporan'    },
  { key: 'settings',  label: 'Pengaturan' },
];

const EDITABLE_ROLES = ['booking_admin', 'inventory_admin', 'manager'] as const;

const LEVEL_OPTIONS = [
  { value: 'none',  label: 'Tidak Ada Akses', color: 'default' },
  { value: 'read',  label: 'Hanya Lihat',     color: 'blue'    },
  { value: 'write', label: 'Akses Penuh',     color: 'green'   },
];

type PermissionMatrix = Record<string, Record<string, string>>;

export default function RolePermissionsCard() {
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [matrix,    setMatrix]    = useState<PermissionMatrix>({});
  const [original,  setOriginal]  = useState<PermissionMatrix>({});
  const [version,   setVersion]   = useState<number>(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isDirty,   setIsDirty]   = useState(false);
  const [messageApi, ctx] = message.useMessage();

  const selfRole = typeof window !== 'undefined'
    ? localStorage.getItem(ADMIN_ROLE_KEY) ?? ''
    : '';
  const isSuperAdmin = selfRole === 'superadmin';

  useEffect(() => {
    fetchPermissions();
  }, []);

  async function fetchPermissions() {
    setLoading(true);
    try {
      const data = await getRolePermissions();
      setMatrix(deepClone(data.permissions));
      setOriginal(deepClone(data.permissions));
      setVersion(data.version);
      setUpdatedAt(data.updated_at);
      setIsDirty(false);
    } catch {
      messageApi.error('Gagal memuat permissions.');
    } finally {
      setLoading(false);
    }
  }

  function deepClone(obj: PermissionMatrix): PermissionMatrix {
    return JSON.parse(JSON.stringify(obj));
  }

  function handleChange(role: string, resource: string, level: string) {
    setMatrix(prev => ({
      ...prev,
      [role]: { ...prev[role], [resource]: level },
    }));
    setIsDirty(true);
  }

  function handleReset() {
    setMatrix(deepClone(original));
    setIsDirty(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateRolePermissions(matrix);
      setOriginal(deepClone(matrix));
      setVersion(result.version);
      setIsDirty(false);
      // Superadmin yang mengubah tidak ikut di-logout — update lokal version
      localStorage.setItem('perm_version', String(result.version));
      messageApi.success(
        'Permissions berhasil disimpan. Semua pengguna lain akan otomatis logout.'
      );
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      title: 'Menu / Resource',
      dataIndex: 'resource',
      width: 150,
      render: (resource: string) => {
        const r = RESOURCES.find(r => r.key === resource);
        return <Text strong style={{ fontSize: 13 }}>{r?.label ?? resource}</Text>;
      },
    },
    {
      title: (
        <Space size={4}>
          <LockOutlined style={{ color: '#d97706' }} />
          <span>Super Admin</span>
        </Space>
      ),
      width: 160,
      render: () => (
        <Tooltip title="Permission superadmin tidak dapat diubah">
          <Tag color="green" style={{ cursor: 'not-allowed' }}>Akses Penuh</Tag>
        </Tooltip>
      ),
    },
    ...EDITABLE_ROLES.map(role => ({
      title: ROLE_LABELS[role] ?? role,
      width: 180,
      render: (_: unknown, record: { resource: string }) => {
        const currentLevel = matrix[role]?.[record.resource] ?? 'none';
        return (
          <Select
            value={currentLevel}
            onChange={(val) => handleChange(role, record.resource, val)}
            disabled={!isSuperAdmin}
            style={{ width: '100%' }}
            size="small"
            options={LEVEL_OPTIONS.map(o => ({
              value: o.value,
              label: (
                <Tag color={o.color} style={{ margin: 0, fontSize: 11 }}>
                  {o.label}
                </Tag>
              ),
            }))}
          />
        );
      },
    })),
  ];

  const dataSource = RESOURCES.map(r => ({ resource: r.key, key: r.key }));

  return (
    <Card
      title={
        <Space>
          <LockOutlined />
          <span>Manajemen Role &amp; Permission</span>
          {version && (
            <Tag color="blue" style={{ fontSize: 11 }}>v{version}</Tag>
          )}
        </Space>
      }
      extra={
        isSuperAdmin && (
          <Space>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={fetchPermissions}
              loading={loading}
            >
              Refresh
            </Button>
            {isDirty && (
              <Button size="small" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Popconfirm
              title="Simpan Perubahan Permission"
              description={
                <div style={{ maxWidth: 280 }}>
                  Menyimpan perubahan akan <strong>otomatis logout semua pengguna</strong> yang
                  sedang login dan memaksa mereka login ulang dengan permission baru.
                  Lanjutkan?
                </div>
              }
              onConfirm={handleSave}
              okText="Ya, Simpan & Logout Semua"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
              disabled={!isDirty}
            >
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="small"
                loading={saving}
                disabled={!isDirty}
              >
                Simpan Permission
              </Button>
            </Popconfirm>
          </Space>
        )
      }
      style={{ borderRadius: 12 }}
      loading={loading}
    >
      {ctx}

      {!isSuperAdmin && (
        <Alert
          type="warning"
          showIcon
          message="Hanya Super Admin yang dapat mengubah permission."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {updatedAt && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Terakhir diubah: {new Date(updatedAt).toLocaleString('id-ID')}
        </Text>
      )}

      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />

      <div style={{
        marginTop: 12,
        padding: '8px 12px',
        background: '#f9fafb',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
      }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <LockOutlined style={{ marginRight: 4 }} />
          Permission <strong>Super Admin</strong> selalu penuh dan tidak dapat diubah.
          Perubahan permission akan efektif pada login berikutnya.
        </Text>
      </div>
    </Card>
  );
}
