import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Space,
  Card,
  Typography,
  Tag,
  message,
  Result,
  Spin,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import AdminLayout, { useAdminAuth } from "../layout/AdminLayout";
import {
  getUsers,
  createUser,
  updateUserPassword,
  updateUserRole,
  deleteUser,
  bulkDeleteUsers,
} from "../../lib/api";
import type { AdminUser } from "../../lib/api";
import { ADMIN_ROLES } from "../../lib/constants";

const ROLE_LABELS: Record<string, string> = {
  superadmin:      'Super Admin',
  booking_admin:   'Admin Booking',
  inventory_admin: 'Admin Inventaris',
  manager:         'Manager',
};
import { fmtDate } from "../../lib/utils";
import PageHeader from "../ui/PageHeader";

const { Text } = Typography;

type ModalMode = "add" | "change-password" | "change-role";

function AdminUsersContent() {
  const auth = useAdminAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const selfUsername = auth?.currentUsername || "";
  const selfRole = auth?.userRole || "";

  useEffect(() => {
    if (!selfRole) return;
    if (selfRole === "superadmin") fetchUsers();
    else setLoading(false);
  }, [selfRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
      setSelectedIds([]);
    } catch {
      messageApi.error("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setModalMode("add");
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openChangePassword = (user: AdminUser) => {
    setModalMode("change-password");
    setEditingUser(user);
    form.resetFields();
    setModalOpen(true);
  };

  const openChangeRole = (user: AdminUser) => {
    setModalMode("change-role");
    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({ role: user.role });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "add") {
        await createUser({
          username: String(values.username),
          password: String(values.password),
          role: String(values.role),
        });
        messageApi.success("Pengguna berhasil ditambahkan.");
      } else if (modalMode === "change-password" && editingUser) {
        await updateUserPassword(editingUser.id, {
          password: String(values.password),
        });
        messageApi.success("Password berhasil diperbarui.");
      } else if (modalMode === "change-role" && editingUser) {
        await updateUserRole(editingUser.id, { role: String(values.role) });
        messageApi.success("Role berhasil diperbarui.");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      messageApi.error(msg || "Gagal menyimpan pengguna.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    try {
      await deleteUser(user.id);
      messageApi.success("Pengguna berhasil dihapus.");
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      messageApi.error(msg || "Gagal menghapus pengguna.");
    }
  };

  const isSelf = (user: AdminUser) => user.username === selfUsername;
  const isLastUser = users.length <= 1;

  const canBulkDelete = selfRole === "superadmin";

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteUsers(selectedIds);
      messageApi.success(`${result.deleted} pengguna berhasil dihapus.`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : "Gagal menghapus pengguna.",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const rowSelection = canBulkDelete
    ? {
        selectedRowKeys: selectedIds,
        onChange: (keys: React.Key[]) => setSelectedIds(keys as number[]),
        getCheckboxProps: (record: AdminUser) => ({
          disabled: isSelf(record) || users.length - selectedIds.length < 1,
        }),
      }
    : undefined;

  const columns: TableColumnsType<AdminUser> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 60,
      render: (id) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Username",
      dataIndex: "username",
      render: (username, record) => (
        <Space size={6}>
          <span style={{ fontWeight: 500 }}>{username}</span>
          {isSelf(record) && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              (Anda)
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      width: 150,
      render: (role: string) => {
        const colors: Record<string, string> = {
          superadmin: "red",
          booking_admin: "blue",
          inventory_admin: "cyan",
          manager: "green",
        };
        return (
          <Tag color={colors[role] ?? "default"} style={{ fontSize: 11 }}>
            {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
          </Tag>
        );
      },
    },
    {
      title: "Dibuat",
      dataIndex: "created_at",
      width: 180,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {fmtDate(date?.slice(0, 10))}
        </Text>
      ),
    },
    {
      title: "Aksi",
      width: 120,
      render: (_, record) => {
        const canDelete = !isSelf(record) && !isLastUser;
        return (
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openChangePassword(record)}
              title="Ganti Password"
            />
            {!isSelf(record) && (
              <Button
                type="text"
                icon={<IdcardOutlined />}
                onClick={() => openChangeRole(record)}
                title="Ganti Role"
              />
            )}
            <Popconfirm
              title="Hapus Pengguna"
              description={`Yakin ingin menghapus "${record.username}"?`}
              onConfirm={() => handleDelete(record)}
              okText="Hapus"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
              disabled={!canDelete}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={!canDelete}
                title={
                  isSelf(record)
                    ? "Tidak bisa menghapus akun sendiri"
                    : isLastUser
                      ? "Tidak bisa menghapus user terakhir"
                      : "Hapus"
                }
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  if (!auth)
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin />
      </div>
    );

  if (!loading && selfRole !== "superadmin") {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Hanya Super Admin yang dapat mengelola pengguna."
        extra={
          <Button type="primary" href="/admin">
            Kembali ke Halaman Utama
          </Button>
        }
      />
    );
  }

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <PageHeader
          title="Manajemen Pengguna"
          subtitle="Kelola akun admin yang dapat mengakses sistem"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={openAdd}
            >
              Tambah Pengguna
            </Button>
          }
        />

        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          {selectedIds.length > 0 && (
            <div
              style={{
                padding: "12px 16px",
                background: "#fffbf0",
                borderBottom: "1px solid #fde68a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>
                {selectedIds.length} item dipilih
              </span>
              <Space>
                <Button size="small" onClick={() => setSelectedIds([])}>
                  Batal Pilih
                </Button>
                <Popconfirm
                  title="Hapus Pengguna Terpilih"
                  description={`Yakin ingin menghapus ${selectedIds.length} pengguna? Tindakan ini tidak dapat dibatalkan.`}
                  onConfirm={handleBulkDelete}
                  okText="Hapus Semua"
                  cancelText="Batal"
                  okButtonProps={{ danger: true, loading: bulkDeleting }}
                >
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={bulkDeleting}
                  >
                    Hapus {selectedIds.length} Item
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          )}
          <Table
            dataSource={users}
            columns={columns}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            pagination={{ pageSize: 20, showTotal: (t) => `${t} pengguna` }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      </Space>

      <Modal
        title={
          modalMode === "add"
            ? "Tambah Pengguna Baru"
            : modalMode === "change-password"
              ? `Ganti Password — ${editingUser?.username}`
              : `Ganti Role — ${editingUser?.username}`
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={
          modalMode === "add"
            ? "Tambah"
            : modalMode === "change-password"
              ? "Simpan Password"
              : "Simpan Role"
        }
        cancelText="Batal"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {modalMode === "add" && (
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Username wajib diisi" },
                { min: 3, message: "Username minimal 3 karakter" },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: "Hanya huruf, angka, dan underscore",
                },
              ]}
            >
              <Input placeholder="Contoh: operator1" />
            </Form.Item>
          )}
          {(modalMode === "add" || modalMode === "change-role") && (
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Role wajib dipilih" }]}
              initialValue={modalMode === "add" ? "booking_admin" : undefined}
            >
              <Select
                options={ADMIN_ROLES.map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r],
                }))}
              />
            </Form.Item>
          )}
          {modalMode !== "change-role" && (
            <>
              <Form.Item
                name="password"
                label="Password Baru"
                rules={[
                  { required: true, message: "Password wajib diisi" },
                  { min: 6, message: "Password minimal 6 karakter" },
                ]}
              >
                <Input.Password placeholder="Masukkan password" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="Konfirmasi Password"
                dependencies={["password"]}
                rules={[
                  {
                    required: true,
                    message: "Konfirmasi password wajib diisi",
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Password tidak cocok"));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Ulangi password" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminLayout activeKey="users">
      <AdminUsersContent />
    </AdminLayout>
  );
}
