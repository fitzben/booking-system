import { useEffect, useState, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  message,
  Spin,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined,
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminLayout, { useAdminAuth } from "../layout/AdminLayout";
import InventoryForm, { INVENTORY_CATEGORIES } from "./InventoryForm";
import type { InventoryFormValues } from "./InventoryForm";
import {
  getInventory,
  getRooms,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  bulkDeleteInventory,
} from "../../lib/api";
import type { InventoryItem, Room } from "../../lib/api";

const { Text } = Typography;

// ── Category tag colors ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Lighting: "gold",
  Audio: "purple",
  Camera: "blue",
  Grip: "green",
  Furniture: "orange",
  Misc: "default",
};

// ── Condition badge logic ─────────────────────────────────────────────────────

function conditionBadge(item: InventoryItem) {
  const ratio =
    item.quantity_total > 0 ? item.quantity_damaged / item.quantity_total : 0;
  if (item.quantity_damaged === 0) return <Tag color="success">Baik</Tag>;
  if (ratio < 0.3) return <Tag color="warning">Perhatian</Tag>;
  return <Tag color="error">Kritis</Tag>;
}

// ── IDR formatter (not needed here, kept as reference) ────────────────────────

function qty(n: number) {
  return <Text strong>{n}</Text>;
}

// ── Main component ────────────────────────────────────────────────────────────

// ── Main component ────────────────────────────────────────────────────────────

function AdminInventoryContent() {
  const auth = useAdminAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [rooms, setRooms] = useState<Pick<Room, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [form] = Form.useForm<InventoryFormValues>();
  const [msgApi, ctxHolder] = message.useMessage();

  // ── Load data ───────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    try {
      const [inv, rm] = await Promise.all([getInventory(), getRooms()]);
      setItems(inv);
      setRooms(rm);
      setSelectedIds([]);
    } catch {
      msgApi.error("Gagal memuat data inventaris.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const permissions = auth?.permissions ?? {};
  const canWrite = permissions?.inventory === "write";

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteInventory(selectedIds);
      msgApi.success(`${result.deleted} item berhasil dihapus.`);
      setSelectedIds([]);
      loadAll();
    } catch (err) {
      msgApi.error(
        err instanceof Error ? err.message : "Gagal menghapus item.",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const rowSelection = canWrite
    ? {
        selectedRowKeys: selectedIds,
        onChange: (keys: React.Key[]) => setSelectedIds(keys as number[]),
      }
    : undefined;

  // ── Filtered rows ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let rows = items;
    if (categoryFilter)
      rows = rows.filter((r) => r.category === categoryFilter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.code ?? "").toLowerCase().includes(q) ||
          (r.brand ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [items, categoryFilter, searchText]);

  // ── Summary stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    return items.reduce(
      (acc, r) => ({
        itemCount: acc.itemCount + 1,
        totalUnits: acc.totalUnits + r.quantity_total,
        goodUnits: acc.goodUnits + r.quantity_good,
        damagedUnits: acc.damagedUnits + r.quantity_damaged,
        inUseUnits: acc.inUseUnits + r.quantity_in_use,
        availableUnits: acc.availableUnits + r.quantity_available,
      }),
      {
        itemCount: 0,
        totalUnits: 0,
        goodUnits: 0,
        damagedUnits: 0,
        inUseUnits: 0,
        availableUnits: 0,
      },
    );
  }, [items]);

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      category: "Misc",
      is_fixed: false,
      quantity_total: 1,
      quantity_damaged: 0,
      quantity_in_use: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      category: item.category,
      code: item.code ?? "",
      brand: item.brand ?? "",
      model: item.model ?? "",
      default_room_id: item.default_room_id,
      is_fixed: item.is_fixed === 1,
      quantity_total: item.quantity_total,
      quantity_damaged: item.quantity_damaged,
      quantity_in_use: item.quantity_in_use,
      notes: item.notes ?? "",
      photo_url: item.photo_url ?? null,
      photo_key: item.photo_key ?? null,
      service_date: item.service_date ? dayjs(item.service_date) : null,
      warranty_date: item.warranty_date ? dayjs(item.warranty_date) : null,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values: InventoryFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        category: values.category,
        code: values.code || null,
        brand: values.brand || null,
        model: values.model || null,
        default_room_id: values.default_room_id ?? null,
        is_fixed: values.is_fixed ? 1 : 0,
        quantity_total: values.quantity_total,
        quantity_damaged: values.quantity_damaged ?? 0,
        quantity_in_use: values.quantity_in_use ?? 0,
        notes: values.notes || null,
        photo_url: values.photo_url ?? null,
        photo_key: values.photo_key ?? null,
        service_date: values.service_date
          ? values.service_date.format("YYYY-MM-DD")
          : null,
        warranty_date: values.warranty_date
          ? values.warranty_date.format("YYYY-MM-DD")
          : null,
      };

      if (editingItem) {
        const updated = await updateInventoryItem(editingItem.id, payload);
        setItems((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        msgApi.success("Item berhasil diperbarui.");
      } else {
        const created = await createInventoryItem(payload);
        setItems((prev) => [...prev, created]);
        msgApi.success("Item berhasil ditambahkan.");
      }
      setModalOpen(false);
    } catch (err: unknown) {
      msgApi.error((err as Error).message ?? "Gagal menyimpan item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteInventoryItem(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
      msgApi.success("Item dihapus.");
    } catch (err: unknown) {
      msgApi.error((err as Error).message ?? "Gagal menghapus item.");
    }
  };

  // ── Table columns ───────────────────────────────────────────────────────────

  const columns: TableColumnsType<InventoryItem> = [
    {
      title: "#",
      dataIndex: "id",
      width: 52,
      render: (id: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Nama Item",
      dataIndex: "name",
      render: (name: string, row) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
          <Space size={6}>
            <Tag
              color={CATEGORY_COLORS[row.category] ?? "default"}
              style={{ fontSize: 11, margin: 0 }}
            >
              {row.category}
            </Tag>
            {row.brand && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {row.brand}
              </Text>
            )}
            {row.model && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {row.model}
              </Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Kode",
      dataIndex: "code",
      width: 100,
      render: (v: string | null) =>
        v ? (
          <Text code style={{ fontSize: 12 }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Ruangan",
      dataIndex: "default_room_name",
      width: 140,
      render: (v: string | null) =>
        v ? (
          <Tag>{v}</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Text>
        ),
    },
    {
      title: "Total",
      dataIndex: "quantity_total",
      width: 64,
      align: "center" as const,
      render: qty,
    },
    {
      title: "Baik",
      dataIndex: "quantity_good",
      width: 64,
      align: "center" as const,
      render: (v: number) => (
        <Text strong style={{ color: "#16a34a" }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Rusak",
      dataIndex: "quantity_damaged",
      width: 64,
      align: "center" as const,
      render: (v: number) =>
        v > 0 ? (
          <Text strong style={{ color: "#dc2626" }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "Digunakan",
      dataIndex: "quantity_in_use",
      width: 90,
      align: "center" as const,
      render: (v: number) =>
        v > 0 ? (
          <Text strong style={{ color: "#d97706" }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "Tersedia",
      dataIndex: "quantity_available",
      width: 80,
      align: "center" as const,
      render: (v: number) =>
        v > 0 ? (
          <Text strong style={{ color: "#2563eb" }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: "Foto",
      key: "photo",
      width: 60,
      align: "center" as const,
      render: (_: unknown, row: InventoryItem) =>
        row.photo_url ? (
          <Tooltip title="Lihat foto">
            <a href={row.photo_url} target="_blank" rel="noopener noreferrer">
              <img
                src={row.photo_url}
                alt={row.name}
                width={32}
                height={32}
                style={{
                  objectFit: "cover",
                  borderRadius: 4,
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </a>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Text>
        ),
    },
    {
      title: "Garansi",
      key: "warranty",
      width: 110,
      render: (_: unknown, row: InventoryItem) => {
        if (!row.warranty_date)
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Text>
          );
        const daysLeft = dayjs(row.warranty_date).diff(dayjs(), "day");
        if (daysLeft < 0)
          return (
            <Tag color="default" style={{ fontSize: 11 }}>
              Kadaluarsa
            </Tag>
          );
        if (daysLeft <= 7)
          return (
            <Tooltip title={`${daysLeft} hari lagi`}>
              <Tag
                color="error"
                icon={<WarningOutlined />}
                style={{ fontSize: 11 }}
              >
                {row.warranty_date}
              </Tag>
            </Tooltip>
          );
        if (daysLeft <= 30)
          return (
            <Tooltip title={`${daysLeft} hari lagi`}>
              <Tag color="warning" style={{ fontSize: 11 }}>
                {row.warranty_date}
              </Tag>
            </Tooltip>
          );
        return (
          <Tag color="success" style={{ fontSize: 11 }}>
            {row.warranty_date}
          </Tag>
        );
      },
    },
    {
      title: "Kondisi",
      key: "condition",
      width: 90,
      align: "center" as const,
      render: (_: unknown, row) => conditionBadge(row),
    },
    ...(canWrite
      ? [
          {
            title: "Aksi",
            key: "actions",
            width: 100,
            render: (_: unknown, row: InventoryItem) => (
              <Space size={4}>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                >
                  Edit
                </Button>
                <Popconfirm
                  title="Hapus item ini?"
                  okText="Hapus"
                  okButtonProps={{ danger: true }}
                  cancelText="Batal"
                  onConfirm={() => handleDelete(row.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!auth)
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin />
      </div>
    );

  return (
    <>
      {ctxHolder}
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Space align="center" style={{ marginBottom: 4 }}>
            <InboxOutlined style={{ fontSize: 22, color: "#C9A227" }} />
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              Inventaris
            </Typography.Title>
          </Space>
          {canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={openAdd}
              block={typeof window !== "undefined" && window.innerWidth < 768}
            >
              Tambah Item
            </Button>
          )}
        </div>

        {/* ── Summary cards ────────────────────────────────────────────── */}
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              style={{ borderRadius: 10, textAlign: "center" }}
            >
              <Statistic
                title="Jenis Item"
                value={stats.itemCount}
                valueStyle={{ fontSize: "clamp(16px, 3.5vw, 20px)" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              style={{ borderRadius: 10, textAlign: "center" }}
            >
              <Statistic
                title="Total Unit"
                value={stats.totalUnits}
                valueStyle={{ fontSize: "clamp(16px, 3.5vw, 20px)" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              style={{ borderRadius: 10, textAlign: "center" }}
            >
              <Statistic
                title="Kondisi Baik"
                value={stats.goodUnits}
                valueStyle={{
                  color: "#16a34a",
                  fontSize: "clamp(16px, 3.5vw, 20px)",
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              style={{ borderRadius: 10, textAlign: "center" }}
            >
              <Statistic
                title="Rusak"
                value={stats.damagedUnits}
                valueStyle={{
                  color: "#dc2626",
                  fontSize: "clamp(16px, 3.5vw, 20px)",
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              style={{ borderRadius: 10, textAlign: "center" }}
            >
              <Statistic
                title="Sedang Digunakan"
                value={stats.inUseUnits}
                valueStyle={{
                  color: "#d97706",
                  fontSize: "clamp(16px, 3.5vw, 20px)",
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              style={{ borderRadius: 10, textAlign: "center" }}
            >
              <Statistic
                title="Tersedia"
                value={stats.availableUnits}
                valueStyle={{
                  color: "#2563eb",
                  fontSize: "clamp(16px, 3.5vw, 20px)",
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* ── Filters + Table ──────────────────────────────────────────── */}
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          {/* Filter bar */}
          <div style={{ padding: 16 }}>
            <Space wrap size={12} style={{ width: "100%" }}>
              <Input
                placeholder="Cari nama / kode / brand..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 240 }}
              />
              <Select
                placeholder="Semua Kategori"
                value={categoryFilter}
                onChange={(v) => setCategoryFilter(v)}
                allowClear
                style={{ width: 160 }}
                options={INVENTORY_CATEGORIES.map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
              <Button icon={<ReloadOutlined />} onClick={loadAll}>
                Refresh
              </Button>
            </Space>
          </div>

          {canWrite && selectedIds.length > 0 && (
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
                  title="Hapus Item Terpilih"
                  description={`Yakin ingin menghapus ${selectedIds.length} item? Tindakan ini tidak dapat dibatalkan.`}
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

          <Table<InventoryItem>
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={loading}
            size="small"
            rowSelection={rowSelection}
            scroll={{ x: "max-content" }}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (t) => `${t} item`,
            }}
          />
        </Card>
      </Space>

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        title={
          editingItem ? `Edit: ${editingItem.name}` : "Tambah Item Inventaris"
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingItem ? "Simpan Perubahan" : "Tambah Item"}
        cancelText="Batal"
        confirmLoading={saving}
        width={560}
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", paddingRight: 4 },
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <InventoryForm rooms={rooms} />
        </Form>
      </Modal>
    </>
  );
}

export default function AdminInventoryPage() {
  return (
    <AdminLayout activeKey="inventory">
      <AdminInventoryContent />
    </AdminLayout>
  );
}
