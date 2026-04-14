import React, { useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Tag,
  Select,
  Input,
  Button,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  Breadcrumb,
  Spin,
  Divider,
  Tabs,
  Form,
  InputNumber,
  Checkbox,
  DatePicker,
  TimePicker,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoginOutlined,
  LogoutOutlined,
  PhoneOutlined,
  PlusCircleOutlined,
  SaveOutlined,
  SwapOutlined,
  ToolOutlined,
  WarningOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import AdminLayout from "../layout/AdminLayout";
import {
  getBooking,
  getBookingTimeline,
  getRooms,
  updateBooking,
  markBookingRead,
  markBookingContacted,
} from "../../lib/api";
import type { Booking, BookingTimelineEntry, Room } from "../../lib/api";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  BOOKING_STATUSES,
  KEPERLUAN_OPTIONS,
  JENIS_PRODUKSI_OPTIONS,
  FASILITAS_OPTIONS,
  type BookingStatus,
} from "../../lib/constants";
import { fmtDate, parseDetails } from "../../lib/utils";
import StatusTag from "../ui/StatusTag";
import BookingHandoverTab from "./BookingHandoverTab";
import BookingEquipmentTab from "./BookingEquipmentTab";
import BookingIncidentTab from "./BookingIncidentTab";
import BookingDocumentsTab from "./BookingDocumentsTab";
import { validateWhatsapp } from "./BookingFormSimple";

const { Title, Text } = Typography;

// ── Timeline tab ─────────────────────────────────────────────────────────────

function BookingTimelineTab({
  timeline,
  loading,
}: {
  timeline: BookingTimelineEntry[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!timeline.length) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <ClockCircleOutlined
          style={{ fontSize: 32, marginBottom: 12, display: "block" }}
        />
        <div style={{ fontSize: 14 }}>Belum ada log aktivitas</div>
      </div>
    );
  }

  const EVENT_CONFIG: Record<
    string,
    {
      icon: React.ReactNode;
      color: string;
      bg: string;
      label: (entry: BookingTimelineEntry) => string;
    }
  > = {
    created: {
      icon: <PlusCircleOutlined />,
      color: "#059669",
      bg: "#ecfdf5",
      label: (e) =>
        `Booking dibuat${e.actor === "public" ? " via form publik" : ""}`,
    },
    read: {
      icon: <EyeOutlined />,
      color: "#2563eb",
      bg: "#eff6ff",
      label: (e) => `Dibaca oleh ${e.actor ?? "-"}`,
    },
    contacted: {
      icon: <PhoneOutlined />,
      color: "#d97706",
      bg: "#fffbeb",
      label: (e) => `Pemohon dihubungi oleh ${e.actor ?? "-"}`,
    },
    status_changed: {
      icon: <SwapOutlined />,
      color: "#7c3aed",
      bg: "#f5f3ff",
      label: (e) => {
        const from =
          STATUS_LABELS[e.from_status as BookingStatus] ?? e.from_status ?? "—";
        const to =
          STATUS_LABELS[e.to_status as BookingStatus] ?? e.to_status ?? "—";
        return `${from} → ${to}`;
      },
    },
    checkin: {
      icon: <LoginOutlined />,
      color: "#0891b2",
      bg: "#ecfeff",
      label: (e) => `Check-in oleh ${e.actor ?? "-"}`,
    },
    checkout: {
      icon: <LogoutOutlined />,
      color: "#6b7280",
      bg: "#f9fafb",
      label: (e) => `Check-out oleh ${e.actor ?? "-"}`,
    },
    document_uploaded: {
      icon: <FileTextOutlined />,
      color: "#d97706",
      bg: "#fffbeb",
      label: () => "Dokumen diupload",
    },
    note_added: {
      icon: <FileTextOutlined />,
      color: "#6b7280",
      bg: "#f9fafb",
      label: () => "Catatan ditambahkan",
    },
  };

  return (
    <div style={{ padding: "20px 24px 8px" }}>
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: 19,
            top: 20,
            bottom: 20,
            width: 2,
            background: "#e5e7eb",
            zIndex: 0,
          }}
        />

        {timeline.map((entry, idx) => {
          const config = EVENT_CONFIG[entry.event_type] ?? {
            icon: <ClockCircleOutlined />,
            color: "#9ca3af",
            bg: "#f9fafb",
            label: () => entry.event_type,
          };
          const isLast = idx === timeline.length - 1;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                gap: 16,
                marginBottom: isLast ? 0 : 20,
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: config.bg,
                  border: `2px solid ${config.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: config.color,
                  fontSize: 16,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {config.icon}
              </div>

              {/* Content card */}
              <div
                style={{
                  flex: 1,
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "12px 16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Event label */}
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  {config.label(entry)}
                </div>

                {/* Status badges for status_changed */}
                {entry.event_type === "status_changed" && (
                  <div style={{ marginBottom: 6 }}>
                    <Space size={6}>
                      {entry.from_status && (
                        <Tag
                          color={
                            STATUS_COLORS[entry.from_status as BookingStatus]
                          }
                          style={{ fontSize: 11, margin: 0 }}
                        >
                          {STATUS_LABELS[entry.from_status as BookingStatus] ??
                            entry.from_status}
                        </Tag>
                      )}
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>→</span>
                      {entry.to_status && (
                        <Tag
                          color={
                            STATUS_COLORS[entry.to_status as BookingStatus]
                          }
                          style={{ fontSize: 11, margin: 0 }}
                        >
                          {STATUS_LABELS[entry.to_status as BookingStatus] ??
                            entry.to_status}
                        </Tag>
                      )}
                    </Space>
                  </div>
                )}

                {/* Note */}
                {entry.note && entry.event_type !== "status_changed" && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 6,
                      fontStyle: "italic",
                    }}
                  >
                    {entry.note}
                  </div>
                )}

                {/* Footer: time + actor */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 4,
                  }}
                >
                  <Space size={4} style={{ color: "#9ca3af", fontSize: 11 }}>
                    <ClockCircleOutlined />
                    <span>
                      {dayjs
                        .utc(entry.created_at)
                        .tz("Asia/Jakarta")
                        .format("DD MMM YYYY, HH:mm")}
                    </span>
                  </Space>

                  {entry.actor && entry.actor !== "public" && (
                    <Space size={4}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#6b7280",
                        }}
                      >
                        {entry.actor.charAt(0).toUpperCase()}
                      </div>
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>
                        {entry.actor}
                      </Text>
                      {entry.actor_role && (
                        <Tag
                          style={{
                            fontSize: 10,
                            padding: "0 4px",
                            margin: 0,
                            lineHeight: "16px",
                            height: 16,
                          }}
                        >
                          {entry.actor_role}
                        </Tag>
                      )}
                    </Space>
                  )}

                  {entry.actor === "public" && (
                    <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                      Form Publik
                    </Tag>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminBookingDetail({
  bookingId,
}: {
  bookingId: number;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const [timeline, setTimeline] = useState<BookingTimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Per-card edit state
  const [editingApplicant, setEditingApplicant] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState(false);
  const [editingPeminjaman, setEditingPeminjaman] = useState(false);
  const [savingCard, setSavingCard] = useState<string | null>(null);

  // Form instances
  const [formApplicant] = Form.useForm();
  const [formKegiatan] = Form.useForm();
  const [formPeminjaman] = Form.useForm();

  // Watched values for conditional fields
  const watchedKeperluan = Form.useWatch("keperluan", formKegiatan);
  const watchedJenisProduksi = Form.useWatch("jenis_produksi", formKegiatan);

  useEffect(() => {
    (async () => {
      try {
        const [data, roomList] = await Promise.all([
          getBooking(bookingId),
          getRooms(),
        ]);
        setBooking(data);
        setStatus(data.status);
        setAdminNotes(data.admin_notes ?? "");
        setRooms(roomList);
        markBookingRead(bookingId).catch(() => undefined);
        setTimelineLoading(true);
        getBookingTimeline(bookingId)
          .then(setTimeline)
          .catch(() => undefined)
          .finally(() => setTimelineLoading(false));
      } catch (err: unknown) {
        const msg = (err as Error).message;
        setError(
          msg === "NOT_FOUND"
            ? "Booking tidak ditemukan."
            : "Gagal memuat data booking.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleMarkContacted = async () => {
    setContacting(true);
    try {
      await markBookingContacted(bookingId);
      const updated = await getBooking(bookingId);
      setBooking(updated);
      setStatus(updated.status);
      message.success("Booking ditandai sudah dihubungi");
    } catch (err) {
      message.error((err as Error).message ?? "Gagal menandai booking");
    } finally {
      setContacting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError("");
    try {
      const updated = await updateBooking(bookingId, {
        status,
        admin_notes: adminNotes,
      });
      setBooking(updated);
      setStatus(updated.status);
      setAdminNotes(updated.admin_notes ?? "");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  // ── Per-card save handlers ───────────────────────────────────────────────────

  const handleSaveApplicant = async () => {
    const values = await formApplicant.validateFields();
    setSavingCard("applicant");
    try {
      const updated = await updateBooking(bookingId, {
        applicant_name: values.applicant_name,
        applicant_contact: values.applicant_contact,
        details_patch: {
          email: values.email ?? "",
          applicant_type: values.applicant_type,
          organization: values.organization ?? "",
          position: values.position ?? "",
        },
      });
      setBooking(updated);
      setEditingApplicant(false);
    } catch (err: unknown) {
      message.error((err as Error).message ?? "Gagal menyimpan data pemohon.");
    } finally {
      setSavingCard(null);
    }
  };

  const handleSaveKegiatan = async () => {
    const values = await formKegiatan.validateFields();
    setSavingCard("kegiatan");
    try {
      const updated = await updateBooking(bookingId, {
        purpose: values.keperluan,
        details_patch: {
          keperluan_lainnya: values.keperluan_lainnya ?? "",
          jenis_produksi: values.jenis_produksi ?? "",
          jenis_produksi_lainnya: values.jenis_produksi_lainnya ?? "",
          penjelasan_kegiatan: values.penjelasan_kegiatan ?? "",
          jumlah_crew: values.jumlah_crew ?? 0,
          jumlah_talent: values.jumlah_talent ?? 0,
        },
      });
      setBooking(updated);
      setEditingKegiatan(false);
    } catch (err: unknown) {
      message.error((err as Error).message ?? "Gagal menyimpan data kegiatan.");
    } finally {
      setSavingCard(null);
    }
  };

  const handleSavePeminjaman = async () => {
    const values = await formPeminjaman.validateFields();
    setSavingCard("peminjaman");
    try {
      const dateStart = (values.date_start as Dayjs).format("YYYY-MM-DD");
      const dateEnd = (values.date_end as Dayjs).format("YYYY-MM-DD");
      const startTime = (values.start_time as Dayjs).format("HH:mm");
      const endTime = (values.end_time as Dayjs).format("HH:mm");
      const updated = await updateBooking(bookingId, {
        date: dateStart,
        start_time: startTime,
        end_time: endTime,
        room_id: values.room_id,
        details_patch: {
          date_end: dateEnd,
          fasilitas: values.fasilitas ?? [],
          ruangan: [],
        },
      });
      setBooking(updated);
      setEditingPeminjaman(false);
    } catch (err: unknown) {
      message.error(
        (err as Error).message ?? "Gagal menyimpan detail peminjaman.",
      );
    } finally {
      setSavingCard(null);
    }
  };

  const details = parseDetails(booking?.details);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout activeKey="bookings">
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !booking) {
    return (
      <AdminLayout activeKey="bookings">
        <Alert type="error" message={error} showIcon />
      </AdminLayout>
    );
  }

  // ── Card extra buttons ───────────────────────────────────────────────────────

  const editExtra = (
    isEditing: boolean,
    onEdit: () => void,
    onCancel: () => void,
    onSave: () => void,
    cardKey: string,
  ) =>
    isEditing ? (
      <Space size={4}>
        <Button size="small" onClick={onCancel}>
          Batal
        </Button>
        <Button
          size="small"
          type="primary"
          loading={savingCard === cardKey}
          onClick={onSave}
        >
          Simpan
        </Button>
      </Space>
    ) : (
      <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit}>
        Edit
      </Button>
    );

  // ── Detail view ──────────────────────────────────────────────────────────────

  return (
    <AdminLayout activeKey="bookings">
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {/* Breadcrumb + page header */}
        <div>
          <Breadcrumb
            items={[
              { title: <a href="/admin">Bookings</a> },
              { title: `Booking #${bookingId}` },
            ]}
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Button icon={<ArrowLeftOutlined />} href="/admin" type="text" />
            <Title
              level={4}
              style={{
                marginBottom: 0,
                flex: 1,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Detail Booking #{bookingId}
            </Title>
            {booking!.booking_code && (
              <Tag
                color="orange"
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {booking!.booking_code}
              </Tag>
            )}
            <StatusTag status={booking!.status} />
          </div>
        </div>

        <Row gutter={20}>
          {/* ── Left: info panels ──────────────────────────────────────────── */}
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {/* Applicant */}
              <Card
                title={
                  <Space>
                    Informasi Pemohon
                    {booking!.acknowledged_by && (
                      <Tag color="green" style={{ fontSize: 10 }}>
                        ACK: {booking!.acknowledged_by}
                      </Tag>
                    )}
                  </Space>
                }
                style={{ borderRadius: 12 }}
                extra={editExtra(
                  editingApplicant,
                  () => {
                    formApplicant.setFieldsValue({
                      applicant_name: booking!.applicant_name,
                      applicant_contact: booking!.applicant_contact,
                      email: details?.email ?? "",
                      applicant_type: details?.applicant_type ?? "personal",
                      organization: details?.organization ?? "",
                      position: details?.position ?? "",
                      acknowledged_by: details?.acknowledged_by ?? "",
                    });
                    setEditingApplicant(true);
                  },
                  () => setEditingApplicant(false),
                  handleSaveApplicant,
                  "applicant",
                )}
              >
                {editingApplicant ? (
                  <Form form={formApplicant} layout="vertical" size="small">
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="applicant_name"
                          label="Nama"
                          rules={[{ required: true }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="applicant_contact"
                          label="Kontak WA"
                          rules={[{ validator: validateWhatsapp }]}
                        >
                          <Input
                            prefix="+62"
                            placeholder="8123456789"
                            size="large"
                            onChange={(e) => {
                              const val = e.target.value.replace(/^0+/, "");
                              formApplicant.setFieldsValue({
                                applicant_contact: val,
                              });
                            }}
                            maxLength={13}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="email" label="Email">
                          <Input type="email" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="applicant_type" label="Tipe Pemohon">
                          <Select
                            options={[
                              { value: "personal", label: "Pribadi" },
                              {
                                value: "company",
                                label: "Perusahaan / Instansi",
                              },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="organization"
                          label="Perusahaan / Instansi"
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="position" label="Jabatan">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="acknowledged_by"
                          label="Diketahui Oleh"
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                ) : (
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Nama">
                      {booking!.applicant_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Kontak (WA)">
                      {booking!.applicant_contact}
                      <a
                        href={`https://wa.me/${booking!.applicant_contact}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: "10px" }}
                      >
                        <WhatsAppOutlined />
                      </a>
                    </Descriptions.Item>
                    {!!details?.email && (
                      <Descriptions.Item label="Email">
                        {String(details.email)}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Tipe Pemohon">
                      {details?.applicant_type === "company"
                        ? "Perusahaan / Instansi"
                        : "Pribadi"}
                    </Descriptions.Item>
                    {!!details?.organization && (
                      <Descriptions.Item label="Perusahaan / Instansi">
                        {String(details.organization)}
                      </Descriptions.Item>
                    )}
                    {!!details?.position && (
                      <Descriptions.Item label="Jabatan">
                        {String(details.position)}
                      </Descriptions.Item>
                    )}
                    {!!booking!.acknowledged_by && (
                      <Descriptions.Item label="Diketahui Oleh" span={2}>
                        <Space size={4}>
                          <CheckCircleOutlined
                            style={{ color: "#059669", fontSize: 12 }}
                          />
                          <Text style={{ fontWeight: 500 }}>
                            {booking!.acknowledged_by}
                          </Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                )}
              </Card>

              {/* Kegiatan */}
              <Card
                title="Data Kegiatan"
                style={{ borderRadius: 12 }}
                extra={editExtra(
                  editingKegiatan,
                  () => {
                    formKegiatan.setFieldsValue({
                      keperluan: booking!.purpose,
                      keperluan_lainnya: details?.keperluan_lainnya ?? "",
                      jenis_produksi: details?.jenis_produksi ?? undefined,
                      jenis_produksi_lainnya:
                        details?.jenis_produksi_lainnya ?? "",
                      penjelasan_kegiatan: details?.penjelasan_kegiatan ?? "",
                      jumlah_crew: details?.jumlah_crew ?? 0,
                      jumlah_talent: details?.jumlah_talent ?? 0,
                    });
                    setEditingKegiatan(true);
                  },
                  () => setEditingKegiatan(false),
                  handleSaveKegiatan,
                  "kegiatan",
                )}
              >
                {editingKegiatan ? (
                  <Form form={formKegiatan} layout="vertical" size="small">
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="keperluan" label="Keperluan">
                          <Select
                            options={KEPERLUAN_OPTIONS.map((o) => ({
                              value: o,
                              label: o,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      {watchedKeperluan === "Lainnya" && (
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="keperluan_lainnya"
                            label="Keperluan Lainnya"
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      )}
                      <Col xs={24} sm={12}>
                        <Form.Item name="jenis_produksi" label="Jenis Produksi">
                          <Select
                            allowClear
                            options={JENIS_PRODUKSI_OPTIONS.map((o) => ({
                              value: o,
                              label: o,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      {watchedJenisProduksi === "Lainnya" && (
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="jenis_produksi_lainnya"
                            label="Jenis Produksi Lainnya"
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      )}
                      <Col xs={24}>
                        <Form.Item
                          name="penjelasan_kegiatan"
                          label="Penjelasan Kegiatan"
                        >
                          <Input.TextArea rows={3} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="jumlah_crew" label="Jumlah Crew">
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="jumlah_talent" label="Jumlah Talent">
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                ) : (
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Keperluan">
                      {booking!.purpose}
                      {details?.keperluan_lainnya
                        ? ` (${details.keperluan_lainnya as string})`
                        : ""}
                    </Descriptions.Item>
                    <Descriptions.Item label="Jenis Produksi">
                      {(details?.jenis_produksi as string | undefined) ?? "-"}
                      {details?.jenis_produksi_lainnya
                        ? ` (${details.jenis_produksi_lainnya as string})`
                        : ""}
                    </Descriptions.Item>
                    <Descriptions.Item label="Penjelasan" span={2}>
                      <Text italic>
                        {String(details?.penjelasan_kegiatan ?? "-")}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Jumlah Crew">
                      {String(details?.jumlah_crew ?? "-")}
                    </Descriptions.Item>
                    <Descriptions.Item label="Jumlah Talent">
                      {String(details?.jumlah_talent ?? "-")}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </Card>

              {/* Peminjaman */}
              <Card
                title="Detail Peminjaman"
                style={{ borderRadius: 12 }}
                extra={editExtra(
                  editingPeminjaman,
                  () => {
                    const detailsNow = parseDetails(booking!.details);
                    formPeminjaman.setFieldsValue({
                      date_start: dayjs(booking!.date),
                      date_end: detailsNow?.date_end
                        ? dayjs(detailsNow.date_end as string)
                        : dayjs(booking!.date),
                      start_time: dayjs(booking!.start_time, "HH:mm"),
                      end_time: dayjs(booking!.end_time, "HH:mm"),
                      room_id: booking!.room_id,
                      fasilitas:
                        (detailsNow?.fasilitas as string[] | undefined) ?? [],
                    });
                    setEditingPeminjaman(true);
                  },
                  () => setEditingPeminjaman(false),
                  handleSavePeminjaman,
                  "peminjaman",
                )}
              >
                {editingPeminjaman ? (
                  <Form form={formPeminjaman} layout="vertical" size="small">
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="date_start"
                          label="Tanggal Mulai"
                          rules={[{ required: true }]}
                        >
                          <DatePicker
                            format="DD/MM/YYYY"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="date_end"
                          label="Tanggal Selesai"
                          rules={[{ required: true }]}
                        >
                          <DatePicker
                            format="DD/MM/YYYY"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="start_time" label="Waktu Mulai">
                          <TimePicker
                            format="HH:mm"
                            minuteStep={30}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="end_time" label="Waktu Selesai">
                          <TimePicker
                            format="HH:mm"
                            minuteStep={30}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="room_id" label="Ruangan">
                          <Select
                            options={rooms.map((r) => ({
                              value: r.id,
                              label: r.name,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item name="fasilitas" label="Fasilitas">
                          <Checkbox.Group
                            options={FASILITAS_OPTIONS.map((f) => ({
                              label: f.label,
                              value: f.value,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                ) : (
                  <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Tanggal Mulai">
                      {fmtDate(booking!.date, true)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tanggal Selesai">
                      {details?.date_end
                        ? fmtDate(details.date_end as string, true)
                        : fmtDate(booking!.date, true)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Waktu">
                      {booking!.start_time} – {booking!.end_time}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fasilitas">
                      {(details?.fasilitas as string[] | undefined)?.join(
                        ", ",
                      ) ?? "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ruangan" span={2}>
                      <Space wrap size={6}>
                        {(details?.ruangan as string[] | undefined)?.map(
                          (r) => <Tag key={r}>{r}</Tag>,
                        ) ?? <span>{booking!.room_name ?? "-"}</span>}
                        {!!details?.ruangan_lainnya && (
                          <Tag>{String(details.ruangan_lainnya)}</Tag>
                        )}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </Card>
            </Space>
          </Col>

          {/* ── Right: admin controls ─────────────────────────────────────── */}
          <Col xs={24} lg={8} style={{ marginTop: 0 }}>
            <Card title="Status & Kontrol Admin" style={{ borderRadius: 12 }}>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {/* Current status badge */}
                <div>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      letterSpacing: "0.06em",
                      display: "block",
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Status Saat Ini
                  </Text>
                  <StatusTag
                    status={booking!.status}
                    style={{ fontSize: 14, padding: "4px 12px" }}
                  />
                </div>

                {!booking!.contacted_at && booking!.status === "pending" && (
                  <Button
                    icon={<PhoneOutlined />}
                    onClick={handleMarkContacted}
                    loading={contacting}
                    block
                    style={{ borderColor: "#d97706", color: "#d97706" }}
                  >
                    Tandai Sudah Dihubungi
                  </Button>
                )}

                {booking!.contacted_at && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                    }}
                  >
                    <Space>
                      <CheckCircleOutlined style={{ color: "#16a34a" }} />
                      <span style={{ color: "#15803d" }}>
                        Sudah dihubungi oleh{" "}
                        <strong>{booking!.contacted_by}</strong>
                        <br />
                        <span style={{ color: "#4ade80" }}>
                          {dayjs
                            .utc(booking!.contacted_at)
                            .tz("Asia/Jakarta")
                            .format("DD MMM YYYY, HH:mm")}
                        </span>
                      </span>
                    </Space>
                  </div>
                )}

                <Divider style={{ margin: 0 }} />

                {/* Status selector */}
                <div>
                  <Text
                    style={{ fontSize: 13, display: "block", marginBottom: 8 }}
                  >
                    Ubah Status
                  </Text>
                  <Select
                    value={status}
                    onChange={(v) => setStatus(v as BookingStatus)}
                    style={{ width: "100%" }}
                    size="large"
                    options={BOOKING_STATUSES.map((s) => ({
                      value: s,
                      label: (
                        <Tag color={STATUS_COLORS[s]} style={{ margin: 0 }}>
                          {STATUS_LABELS[s]}
                        </Tag>
                      ),
                    }))}
                  />
                </div>

                {/* Admin notes */}
                <div>
                  <Text
                    style={{ fontSize: 13, display: "block", marginBottom: 4 }}
                  >
                    Catatan Admin
                  </Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: "block", marginBottom: 8 }}
                  >
                    Catatan serah terima, penggunaan equipment,
                    kerusakan/kehilangan, dll.
                  </Text>
                  <Input.TextArea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={5}
                    placeholder="Tambahkan catatan di sini..."
                  />
                </div>

                {saveSuccess && (
                  <Alert
                    type="success"
                    message="Perubahan berhasil disimpan."
                    showIcon
                  />
                )}
                {error && <Alert type="error" message={error} showIcon />}

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  size="large"
                  block
                  loading={saving}
                  onClick={handleSave}
                >
                  Simpan Perubahan
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: "0 0 8px" } }}
        >
          <Tabs
            defaultActiveKey="timeline"
            style={{ paddingInline: 24 }}
            items={[
              {
                key: "timeline",
                label: (
                  <Space size={6}>
                    <ClockCircleOutlined />
                    Timeline
                    {/* {timeline.length > 0 && (
                      <Badge
                        count={timeline.length}
                        size="small"
                        style={{ backgroundColor: "#6b7280" }}
                      />
                    )} */}
                  </Space>
                ),
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <BookingTimelineTab
                      timeline={timeline}
                      loading={timelineLoading}
                    />
                  </div>
                ),
              },
              {
                key: "handover",
                label: (
                  <Space size={6}>
                    <SwapOutlined />
                    Serah Terima
                  </Space>
                ),
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <BookingHandoverTab bookingId={bookingId} />
                  </div>
                ),
              },
              {
                key: "equipment",
                label: (
                  <Space size={6}>
                    <ToolOutlined />
                    Equipment Usage
                  </Space>
                ),
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <BookingEquipmentTab bookingId={bookingId} />
                  </div>
                ),
              },
              {
                key: "incident",
                label: (
                  <Space size={6}>
                    <WarningOutlined />
                    Incident / Kerusakan
                  </Space>
                ),
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <BookingIncidentTab bookingId={bookingId} />
                  </div>
                ),
              },
              {
                key: "documents",
                label: (
                  <Space size={6}>
                    <FileTextOutlined />
                    Dokumen Identitas
                  </Space>
                ),
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <BookingDocumentsTab bookingId={bookingId} />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </AdminLayout>
  );
}
