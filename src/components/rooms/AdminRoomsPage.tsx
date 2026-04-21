import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Popconfirm,
  Space,
  Card,
  Typography,
  Tag,
  message,
  Tooltip,
  Tabs,
  Spin,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import AdminLayout, { useAdminAuth } from "../layout/AdminLayout";
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomPricing,
  setRoomPricing,
  bulkDeleteRooms,
} from "../../lib/api";
import type { Room } from "../../lib/api";
import { ROOM_TYPE_OPTIONS } from "../../lib/constants";
import { fmtPrice } from "../../lib/utils";
import PageHeader from "../ui/PageHeader";
import RoomForm, { roomToFormValues, rawToArray } from "./RoomForm";
import type { RoomFormValues } from "./RoomForm";
import RoomMediaSection from "../media/RoomMediaSection";
import { Form } from "antd";

const { Text } = Typography;

const typeLabel = (type: string) =>
  ROOM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

// ── Component ──────────────────────────────────────────────────────────────────

function AdminRoomsContent() {
  const auth = useAdminAuth();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaCount, setMediaCount] = useState(0);
  const [form] = Form.useForm<RoomFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const updated = await getRooms();
      setRooms(updated);
      setSelectedIds([]);
      // Keep editingRoom in sync so the Media tab reflects fresh data
      setEditingRoom((prev) => {
        if (!prev) return prev;
        return updated.find((r) => r.id === prev.id) ?? prev;
      });
    } catch {
      messageApi.error("Gagal memuat data ruangan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const permissions = auth?.permissions ?? {};
  const canWrite = permissions?.rooms === "write";

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteRooms(selectedIds);
      messageApi.success(`${result.deleted} ruangan berhasil dihapus.`);
      setSelectedIds([]);
      fetchRooms();
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : "Gagal menghapus ruangan.",
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

  // ── Modal open helpers ─────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingRoom(null);
    form.resetFields();
    form.setFieldsValue({ tiers: [], overtime_rate: 0 });
    setModalOpen(true);
  };

  const openEdit = async (room: Room) => {
    setEditingRoom(room);
    setMediaCount(0);
    // Set base values immediately so the modal renders without blank fields
    form.setFieldsValue(roomToFormValues(room, []));
    setModalOpen(true);

    // Load pricing tiers asynchronously after modal opens
    setTiersLoading(true);
    try {
      const tiers = await getRoomPricing(room.id);
      form.setFieldsValue({
        tiers: tiers.map((t) => ({ hours: t.hours, price: t.price })),
        overtime_rate: room.overtime_rate ?? 0,
      });
    } catch {
      messageApi.error("Gagal memuat pricing tiers.");
    } finally {
      setTiersLoading(false);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    let values: RoomFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const roomPayload = {
        name: values.name,
        type: values.type,
        base_price: values.base_price ?? null,
        overtime_rate: values.overtime_rate ?? 0,
        notes: values.notes || null,
        capacity: values.capacity || null,
        short_description: values.short_description || null,
        facilities: rawToArray(values.facilities_raw),
        equipment_highlights: rawToArray(values.equipment_raw),
        default_equipment: values.default_equipment ?? [],
      };
      const tiers = values.tiers ?? [];
      const overtimeRate = values.overtime_rate ?? 0;

      if (editingRoom) {
        await Promise.all([
          updateRoom(editingRoom.id, roomPayload),
          setRoomPricing(editingRoom.id, {
            tiers,
            overtime_rate: overtimeRate,
          }),
        ]);
        messageApi.success("Ruangan berhasil diperbarui.");
      } else {
        const created = await createRoom(roomPayload);
        await setRoomPricing(created.id, {
          tiers,
          overtime_rate: overtimeRate,
        });
        messageApi.success("Ruangan berhasil ditambahkan.");
      }
      setModalOpen(false);
      fetchRooms();
    } catch {
      messageApi.error("Gagal menyimpan ruangan.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    try {
      await deleteRoom(id);
      messageApi.success("Ruangan berhasil dihapus.");
      fetchRooms();
    } catch {
      messageApi.error("Gagal menghapus ruangan.");
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns: TableColumnsType<Room> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 56,
      render: (id) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Nama Ruangan",
      dataIndex: "name",
      render: (name, record) => (
        <Space size={8}>
          {record.cover_image ? (
            <Tooltip title={record.cover_image}>
              <PictureOutlined style={{ color: "#22d3ee", fontSize: 14 }} />
            </Tooltip>
          ) : (
            <PictureOutlined style={{ color: "#d1d5db", fontSize: 14 }} />
          )}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: "Tipe",
      dataIndex: "type",
      width: 150,
      render: (type) => <Tag>{typeLabel(type)}</Tag>,
    },
    {
      title: "Harga Dasar",
      dataIndex: "base_price",
      width: 160,
      render: (price) =>
        price != null ? (
          <span style={{ fontWeight: 500 }}>{fmtPrice(price)}</span>
        ) : (
          <Tag color="orange" style={{ fontSize: 11 }}>
            Belum Diatur
          </Tag>
        ),
    },
    {
      title: "Kapasitas",
      dataIndex: "capacity",
      width: 160,
      render: (v) => (v ? <Text>{v}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: "Detail Publik",
      width: 120,
      render: (_, record) => {
        const hasDetails = !!(record.cover_image || record.short_description);
        const facCount = record.facilities?.length ?? 0;
        return hasDetails ? (
          <Tag color="cyan">
            Configured{facCount > 0 ? ` · ${facCount} fas.` : ""}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Text>
        );
      },
    },
    ...(canWrite
      ? [
          {
            title: "Aksi",
            width: 90,
            render: (_: unknown, record: Room) => (
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  title="Edit"
                />
                <Popconfirm
                  title="Hapus Ruangan"
                  description={`Yakin ingin menghapus "${record.name}"?`}
                  onConfirm={() => handleDelete(record.id)}
                  okText="Hapus"
                  cancelText="Batal"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    title="Hapus"
                  />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!auth)
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin />
      </div>
    );

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <PageHeader
          title="Manajemen Ruangan"
          subtitle="Kelola daftar ruangan, fasilitas, dan detail untuk landing page publik"
          extra={
            canWrite ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={openAdd}
                block={typeof window !== "undefined" && window.innerWidth < 768}
                style={{ color: "#fff", fontWeight: "700" }}
              >
                Tambah Ruangan
              </Button>
            ) : undefined
          }
        />

        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
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
                  title="Hapus Ruangan Terpilih"
                  description={`Yakin ingin menghapus ${selectedIds.length} ruangan? Tindakan ini tidak dapat dibatalkan.`}
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
            dataSource={rooms}
            columns={columns}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            pagination={{ pageSize: 20, showTotal: (t) => `${t} ruangan` }}
            scroll={{ x: "max-content" }}
          />
        </Card>
      </Space>

      {/* ── Add / Edit modal ──────────────────────────────────────────────── */}
      <Modal
        title={
          editingRoom ? `Edit: ${editingRoom.name}` : "Tambah Ruangan Baru"
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingRoom ? "Simpan Perubahan" : "Tambah"}
        cancelText="Batal"
        confirmLoading={saving}
        width={680}
        styles={{
          body: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 },
        }}
      >
        {editingRoom ? (
          <Tabs
            items={[
              {
                key: "detail",
                label: "Detail",
                children: <RoomForm form={form} tiersLoading={tiersLoading} />,
              },
              {
                key: "media",
                label: `Media${mediaCount > 0 ? ` (${mediaCount})` : ""}`,
                children: (
                  <RoomMediaSection
                    room={editingRoom}
                    onSaved={fetchRooms}
                    onCountChange={setMediaCount}
                  />
                ),
              },
            ]}
          />
        ) : (
          <RoomForm form={form} tiersLoading={tiersLoading} />
        )}
      </Modal>
    </>
  );
}

export default function AdminRoomsPage() {
  return (
    <AdminLayout activeKey="rooms">
      <AdminRoomsContent />
    </AdminLayout>
  );
}
