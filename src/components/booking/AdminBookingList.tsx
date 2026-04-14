import React, { useEffect, useState, useRef } from "react";
import {
  Table,
  Tag,
  Button,
  Select,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Input,
  Tooltip,
  Alert,
  Modal,
  Divider,
  Popconfirm,
  message,
  Typography,
  DatePicker,
} from "antd";

const { Text } = Typography;
import type { TableColumnsType } from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  PhoneOutlined,
  WarningOutlined,
  PlusOutlined,
  BellOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import AdminLayout, { useAdminAuth } from "../layout/AdminLayout";
import {
  getBookings,
  getExpiringWarrantyItems,
  markBookingRead,
  bulkDeleteBookings,
  updateBooking,
  markBookingContacted,
} from "../../lib/api";
import type { Booking, InventoryItem } from "../../lib/api";
import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  type BookingStatus,
  ROLE_PERMISSIONS,
  type AdminRole,
} from "../../lib/constants";
import { fmtDate, parseDetails } from "../../lib/utils";
import StatusTag from "../ui/StatusTag";
import PageHeader from "../ui/PageHeader";
import BookingFormSimple from "./BookingFormSimple";
import "./AdminBookingList.css";

function AdminBookingListContent() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const auth = useAdminAuth();
  const userRole = auth?.userRole || "";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [hidePast, setHidePast] = useState(true);

  // Stats kept separate — always reflects all data
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    in_progress: 0,
    finished: 0,
    rejected: 0,
    contacted: 0,
    not_contacted: 0,
    unread_count: 0,
  });
  const [expiringItems, setExpiringItems] = useState<InventoryItem[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [messageApi, contextHolder] = message.useMessage();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // ── Create booking modal state ─────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBookings = async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    sortField?: string;
    sortOrder?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    try {
      const p: Parameters<typeof getBookings>[0] = {
        page: params?.page ?? page,
        page_size: params?.pageSize ?? pageSize,
        status: params?.status ?? statusFilter,
        search: params?.search ?? search,
        sort_field: params?.sortField ?? sortField,
        sort_order: params?.sortOrder ?? sortOrder,
      };
      const effectiveDateFrom =
        params?.dateFrom !== undefined
          ? params.dateFrom
          : hidePast && !dateFrom
            ? dayjs().format("YYYY-MM-DD")
            : dateFrom;
      const dt = params?.dateTo !== undefined ? params.dateTo : dateTo;
      if (effectiveDateFrom) p.date_from = effectiveDateFrom;
      if (dt) p.date_to = dt;
      const json = await getBookings(p);

      setBookings(json.data);
      setTotal(json.total);
      if (json.stats) setStats(json.stats);
      if (json.read_booking_ids) setReadIds(new Set(json.read_booking_ids));
      setSelectedIds([]);
    } catch {
      // handled at AdminLayout level
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userRole) return;

    fetchBookings();
    getExpiringWarrantyItems(30)
      .then(setExpiringItems)
      .catch(() => undefined);
  }, [userRole]);

  const perms = userRole ? ROLE_PERMISSIONS[userRole as AdminRole] : null;
  const canWrite = perms?.bookings === "write";

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteBookings(selectedIds);
      messageApi.success(`${result.deleted} booking berhasil dihapus.`);
      setSelectedIds([]);
      fetchBookings();
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : "Gagal menghapus booking.",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const refreshStats = async () => {
    try {
      const qs = new URLSearchParams({ page: "1", page_size: "1" }).toString();
      const res = await fetch(`/api/bookings?${qs}`);
      if (!res.ok) return;
      const json = (await res.json()) as { stats?: typeof stats };
      if (json.stats) setStats(json.stats);
    } catch {
      /* silent */
    }
  };

  async function handleInlineStatusUpdate(
    bookingId: number,
    newStatus: BookingStatus,
  ) {
    setUpdatingId(bookingId);
    try {
      await updateBooking(bookingId, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
      );
      messageApi.success("Status berhasil diperbarui.");
      refreshStats();
    } catch {
      messageApi.error("Gagal memperbarui status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleInlineContactedUpdate(bookingId: number) {
    setUpdatingId(bookingId);
    try {
      await markBookingContacted(bookingId);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                contacted_at: new Date().toISOString(),
                status: "in_progress" as BookingStatus,
              }
            : b,
        ),
      );
      setStats((prev) => ({
        ...prev,
        contacted: prev.contacted + 1,
        not_contacted: Math.max(0, prev.not_contacted - 1),
        pending: Math.max(0, prev.pending - 1),
      }));
      messageApi.success(`Booking ID ${bookingId} ditandai sudah dihubungi.`);
      refreshStats();
    } catch {
      messageApi.error("Gagal memperbarui follow up.");
    } finally {
      setUpdatingId(null);
    }
  }

  const rowSelection = canWrite
    ? {
        selectedRowKeys: selectedIds,
        onChange: (keys: React.Key[]) => setSelectedIds(keys as number[]),
      }
    : undefined;

  // Debounce search input — wait 400ms after user stops typing
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchBookings({ search: value, page: 1 });
    }, 400);
  }

  function handleStatusChange(value: BookingStatus | "all") {
    setStatusFilter(value);
    setPage(1);
    fetchBookings({ status: value, page: 1 });
  }

  function handleTableChange(pagination: any, _filters: any, sorter: any) {
    const newPage = pagination.current ?? 1;
    const newPageSize = pagination.pageSize ?? pageSize;

    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const newField = (s.field as string) ?? sortField;
    const newOrder = s.order === "ascend" ? "asc" : "desc";

    setPage(newPage);
    setPageSize(newPageSize);
    setSortField(newField);
    setSortOrder(newOrder);

    fetchBookings({
      page: newPage,
      pageSize: newPageSize,
      sortField: newField,
      sortOrder: newOrder,
    });
  }

  const columns: TableColumnsType<Booking> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 90,
      sorter: true,
      defaultSortOrder: "descend",
      render: (id) => {
        const isUnread = !readIds.has(id);
        return (
          <Space size={4}>
            <span style={{ fontWeight: 600, color: "#6b7280", fontSize: 13 }}>
              #{id}
            </span>
            {isUnread && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#d97706",
                  flexShrink: 0,
                }}
              />
            )}
          </Space>
        );
      },
    },
    {
      title: "Kode",
      dataIndex: "booking_code",
      width: 150,
      render: (code: string | null) =>
        code ? (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "#d97706",
              letterSpacing: "0.05em",
            }}
          >
            {code}
          </span>
        ) : (
          <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>
        ),
    },
    {
      title: "Tanggal",
      dataIndex: "date",
      width: 160,
      sorter: true,
      render: (date, record) => {
        const details = parseDetails(record.details);
        const dateEnd = details?.date_end as string | undefined;
        const isFullDay =
          record.start_time === "00:00" && record.end_time === "23:59";
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{fmtDate(date)}</div>
            {dateEnd && dateEnd !== date && (
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                s/d {fmtDate(dateEnd)}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {isFullDay ? (
                <Tag style={{ fontSize: 10, margin: 0 }} color="blue">
                  Full Day
                </Tag>
              ) : (
                `${record.start_time} – ${record.end_time}`
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Ruangan",
      dataIndex: "details",
      render: (details) => {
        const d = parseDetails(details);
        const rooms = d?.ruangan as string[] | undefined;
        if (!rooms?.length) return <span style={{ color: "#9ca3af" }}>-</span>;
        return (
          <Space wrap size={4}>
            {rooms.slice(0, 2).map((r) => (
              <Tag key={r} style={{ fontSize: 11, margin: 0 }}>
                {r}
              </Tag>
            ))}
            {rooms.length > 2 && (
              <Tag style={{ fontSize: 11, margin: 0 }}>+{rooms.length - 2}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Pemohon",
      dataIndex: "applicant_name",
      sorter: true,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {record.applicant_contact}
          </div>
        </div>
      ),
    },
    {
      title: "Keperluan",
      dataIndex: "purpose",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 160,
      sorter: true,
      render: (status: BookingStatus, record) => {
        if (!canWrite) return <StatusTag status={status} />;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={status}
              size="small"
              loading={updatingId === record.id}
              style={{ width: 140 }}
              onChange={(val) => handleInlineStatusUpdate(record.id, val)}
              options={BOOKING_STATUSES.map((s) => ({
                value: s,
                label: (
                  <Tag
                    color={STATUS_COLORS[s]}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {STATUS_LABELS[s]}
                  </Tag>
                ),
              }))}
            />
          </div>
        );
      },
    },
    {
      title: "Follow Up",
      dataIndex: "contacted_at",
      width: 140,
      render: (contacted_at: string | null, record) => {
        if (contacted_at) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Tooltip
                title={`Oleh: ${record.contacted_by ?? "-"} — ${dayjs.utc(contacted_at).tz("Asia/Jakarta").format("DD/MM HH:mm")}`}
              >
                <Tag color="green" style={{ fontSize: 11 }}>
                  ✓ Dihubungi
                </Tag>
              </Tooltip>
            </div>
          );
        }
        if (
          !canWrite ||
          record.status === "rejected" ||
          record.status === "finished"
        ) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Tag color="default" style={{ fontSize: 11 }}>
                —
              </Tag>
            </div>
          );
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              type="dashed"
              loading={updatingId === record.id}
              onClick={() => handleInlineContactedUpdate(record.id)}
              style={{ fontSize: 11, color: "#d97706", borderColor: "#d97706" }}
            >
              Tandai Dihubungi
            </Button>
          </div>
        );
      },
    },
    {
      title: "",
      width: 60,
      render: (_, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Lihat detail">
            <Button
              type="link"
              icon={<EyeOutlined />}
              href={`/admin/${record.id}`}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const criticalWarranty = expiringItems.filter((i) => {
    const d = new Date(i.warranty_date!);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return diff <= 7;
  });
  const warningWarranty = expiringItems.filter((i) => {
    const d = new Date(i.warranty_date!);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return diff > 7 && diff <= 30;
  });

  return (
    <>
      {contextHolder}
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {criticalWarranty.length > 0 && (
          <Alert
            type="error"
            icon={<WarningOutlined />}
            showIcon
            message="Garansi hampir habis (≤7 hari)"
            description={
              <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                {criticalWarranty.map((i) => (
                  <li key={i.id}>
                    <a href="/admin/inventory">{i.name}</a>
                    {" — "}garansi berakhir <strong>{i.warranty_date}</strong>
                  </li>
                ))}
              </ul>
            }
          />
        )}
        {warningWarranty.length > 0 && (
          <Alert
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            message="Garansi akan habis dalam 30 hari"
            description={
              <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                {warningWarranty.map((i) => (
                  <li key={i.id}>
                    <a href="/admin/inventory">{i.name}</a>
                    {" — "}garansi berakhir <strong>{i.warranty_date}</strong>
                  </li>
                ))}
              </ul>
            }
          />
        )}
        <PageHeader
          title="Daftar Booking"
          subtitle="Kelola semua permohonan peminjaman ruangan"
          extra={
            canWrite ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
                style={{ color: "#fff" }}
              >
                Tambah Booking
              </Button>
            ) : undefined
          }
        />

        {/* Stats row — 6 cards */}
        <Row gutter={[12, 12]}>
          {[
            { label: "Total Booking", value: stats.total, color: "#374151" },
            { label: "Menunggu", value: stats.pending, color: "#d97706" },
            {
              label: "Dalam Proses",
              value: stats.in_progress,
              color: "#2563eb",
            },
            { label: "Disetujui", value: stats.approved, color: "#059669" },
            { label: "Selesai", value: stats.finished, color: "#0891b2" },
            { label: "Ditolak", value: stats.rejected, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <Col key={label} xs={12} sm={8} md={4}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic
                  title={<span style={{ fontSize: 12 }}>{label}</span>}
                  value={value}
                  valueStyle={{ color, fontSize: "clamp(16px, 3vw, 22px)" }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── Awareness Bar ── */}
        {((stats.unread_count ?? 0) > 0 ||
          stats.not_contacted > 0 ||
          stats.contacted > 0) &&
          (() => {
            // Determine urgency level
            const unreadCount = stats.unread_count ?? 0;
            const hasUnread = unreadCount > 0;
            const hasNotContacted = stats.not_contacted > 0;

            const isUrgent = hasUnread || hasNotContacted;
            const isAllGood = !isUrgent;

            const barColor = isAllGood
              ? "#059669"
              : hasUnread
                ? "#d97706" // Warna orange untuk belum dibaca (lebih mendesak/baru)
                : "#2563eb"; // Biru untuk follow up biasa
            const barBg = isAllGood
              ? "#f0fdf4"
              : hasUnread
                ? "#fffbeb"
                : "#eff6ff";
            const barBorder = isAllGood
              ? "#86efac"
              : hasUnread
                ? "#fde68a"
                : "#bfdbfe";

            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  background: barBg,
                  border: `1px solid ${barBorder}`,
                  borderRadius: 10,
                  padding: "10px 16px",
                }}
              >
                {/* Left: icon + message */}
                <Space size={8}>
                  <BellOutlined style={{ color: barColor, fontSize: 14 }} />
                  <Text
                    style={{ fontSize: 13, color: barColor, fontWeight: 600 }}
                  >
                    {isAllGood
                      ? "Semua booking sudah ditangani"
                      : hasUnread
                        ? `${unreadCount} booking belum dibaca`
                        : `${stats.not_contacted} booking belum dihubungi`}
                  </Text>
                </Space>

                {/* Right: 3 inline stats */}
                <Space
                  split={<Divider type="vertical" style={{ margin: 0 }} />}
                  size={0}
                >
                  <Space size={6} style={{ padding: "0 12px" }}>
                    <EyeOutlined
                      style={{
                        fontSize: 12,
                        color:
                          (stats.unread_count ?? 0) > 0 ? "#d97706" : "#9ca3af",
                      }}
                    />
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      Belum Dibaca:&nbsp;
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            (stats.unread_count ?? 0) > 0
                              ? "#d97706"
                              : "#374151",
                        }}
                      >
                        {stats.unread_count ?? 0}
                      </span>
                    </Text>
                  </Space>
                  <Space size={6} style={{ padding: "0 12px" }}>
                    <PhoneOutlined
                      style={{
                        fontSize: 12,
                        color: stats.contacted > 0 ? "#059669" : "#9ca3af",
                      }}
                    />
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      Sudah Dihubungi:&nbsp;
                      <span
                        style={{
                          fontWeight: 700,
                          color: stats.contacted > 0 ? "#059669" : "#374151",
                        }}
                      >
                        {stats.contacted}
                      </span>
                    </Text>
                  </Space>
                  <Space size={6} style={{ padding: "0 12px" }}>
                    <PhoneOutlined
                      style={{
                        fontSize: 12,
                        color: stats.not_contacted > 0 ? "#dc2626" : "#9ca3af",
                        transform: "rotate(135deg)",
                      }}
                    />
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      Belum Dihubungi:&nbsp;
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            stats.not_contacted > 0 ? "#dc2626" : "#374151",
                        }}
                      >
                        {stats.not_contacted}
                      </span>
                    </Text>
                  </Space>
                </Space>
              </div>
            );
          })()}

        <Card
          style={{ borderRadius: 12 }}
          styles={{ body: { padding: "0" } }}
          title={
            <div style={{ padding: "16px 0" }}>
              {/* Row 1: Status filter + Date presets */}
              <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 10 }}>
                <Col flex="none">
                  <Select
                    value={statusFilter}
                    onChange={handleStatusChange}
                    style={{ width: 160 }}
                    options={[
                      { value: "all", label: "Semua Status" },
                      ...BOOKING_STATUSES.map((s) => ({
                        value: s,
                        label: STATUS_LABELS[s],
                      })),
                    ]}
                  />
                </Col>

                <Col flex="none">
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "#e5e7eb",
                      margin: "0 4px",
                    }}
                  />
                </Col>

                <Col flex="none">
                  <Space size={8}>
                    {[
                      {
                        label: "Hari Ini",
                        getValue: () =>
                          [dayjs(), dayjs()] as [
                            ReturnType<typeof dayjs>,
                            ReturnType<typeof dayjs>,
                          ],
                      },
                      {
                        label: "Minggu Ini",
                        getValue: () =>
                          [dayjs().startOf("week"), dayjs().endOf("week")] as [
                            ReturnType<typeof dayjs>,
                            ReturnType<typeof dayjs>,
                          ],
                      },
                      {
                        label: "Bulan Ini",
                        getValue: () =>
                          [
                            dayjs().startOf("month"),
                            dayjs().endOf("month"),
                          ] as [
                            ReturnType<typeof dayjs>,
                            ReturnType<typeof dayjs>,
                          ],
                      },
                    ].map(({ label, getValue }) => {
                      const [s, e] = getValue();
                      const isActive =
                        dateFrom === s.format("YYYY-MM-DD") &&
                        dateTo === e.format("YYYY-MM-DD");
                      return (
                        <Button
                          key={label}
                          size="small"
                          onClick={() => {
                            if (isActive) {
                              setDateFrom("");
                              setDateTo("");
                              setPage(1);
                              fetchBookings({
                                dateFrom: "",
                                dateTo: "",
                                page: 1,
                              });
                            } else {
                              const from = s.format("YYYY-MM-DD");
                              const to = e.format("YYYY-MM-DD");
                              setDateFrom(from);
                              setDateTo(to);
                              setPage(1);
                              fetchBookings({
                                dateFrom: from,
                                dateTo: to,
                                page: 1,
                              });
                            }
                          }}
                          style={
                            isActive
                              ? {
                                  background: "#d97706",
                                  borderColor: "#d97706",
                                  color: "#fff",
                                  fontWeight: 600,
                                }
                              : {
                                  color: "#6b7280",
                                }
                          }
                        >
                          {label}
                        </Button>
                      );
                    })}
                    {/* <Button
                      size="small"
                      type={hidePast ? "primary" : "default"}
                      ghost={hidePast}
                      onClick={() => {
                        const next = !hidePast;
                        setHidePast(next);
                        setPage(1);
                        fetchBookings({ page: 1, dateFrom: next ? dayjs().format("YYYY-MM-DD") : "" });
                      }}
                      style={hidePast ? { borderColor: "#d97706", color: "#d97706" } : { color: "#6b7280" }}
                    >
                      {hidePast ? "📅 Sembunyikan Lewat" : "Tampilkan semua"}
                    </Button> */}
                  </Space>
                </Col>

                {/* Active date indicator chip */}
                {(dateFrom || dateTo) && (
                  <Col flex="none">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 6,
                        padding: "2px 10px",
                        fontSize: 12,
                        color: "#92400e",
                      }}
                    >
                      <CalendarOutlined style={{ fontSize: 11 }} />
                      <span>
                        {dateFrom ? dayjs(dateFrom).format("DD MMM") : "—"}
                        {" – "}
                        {dateTo ? dayjs(dateTo).format("DD MMM YYYY") : "—"}
                      </span>
                      <CloseOutlined
                        style={{
                          fontSize: 10,
                          cursor: "pointer",
                          marginLeft: 2,
                          color: "#b45309",
                        }}
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setPage(1);
                          fetchBookings({ dateFrom: "", dateTo: "", page: 1 });
                        }}
                      />
                    </div>
                  </Col>
                )}
              </Row>

              {/* Row 2: Range picker + Search + Refresh */}
              <Row gutter={[8, 8]} align="middle">
                <Col flex="none">
                  <DatePicker.RangePicker
                    size="small"
                    format="DD MMM YYYY"
                    value={
                      dateFrom && dateTo
                        ? [dayjs(dateFrom), dayjs(dateTo)]
                        : null
                    }
                    onChange={(values) => {
                      if (!values || !values[0] || !values[1]) {
                        setDateFrom("");
                        setDateTo("");
                        setPage(1);
                        fetchBookings({ dateFrom: "", dateTo: "", page: 1 });
                      } else {
                        const from = values[0].format("YYYY-MM-DD");
                        const to = values[1].format("YYYY-MM-DD");
                        setDateFrom(from);
                        setDateTo(to);
                        setPage(1);
                        fetchBookings({ dateFrom: from, dateTo: to, page: 1 });
                      }
                    }}
                    allowClear
                    placeholder={["Dari tanggal", "Sampai tanggal"]}
                    style={{ width: 260 }}
                  />
                </Col>

                <Col flex={1}>
                  <Input
                    placeholder="Cari nama, keperluan, atau kode booking..."
                    prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    allowClear
                    onClear={() => handleSearchChange("")}
                  />
                </Col>

                <Col flex="none">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchBookings()}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </Col>
              </Row>
            </div>
          }
        >
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
                {selectedIds.length} booking dipilih
              </span>
              <Space>
                <Button size="small" onClick={() => setSelectedIds([])}>
                  Batal Pilih
                </Button>
                <Popconfirm
                  title="Hapus Booking Terpilih"
                  description={`Yakin ingin menghapus ${selectedIds.length} booking? Tindakan ini tidak dapat dibatalkan.`}
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
                    Hapus {selectedIds.length} Booking
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          )}
          <Table
            dataSource={bookings}
            columns={columns}
            rowKey="id"
            loading={loading}
            rowSelection={canWrite ? rowSelection : undefined}
            onChange={handleTableChange}
            style={{ borderRadius: 0 }}
            className="booking-table"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (t, range) =>
                `${range[0]}–${range[1]} dari ${t} booking`,
              style: {
                padding: "12px 16px",
                margin: 0,
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              },
            }}
            scroll={{ x: "max-content" }}
            onRow={(record) => ({
              style: {
                cursor: "pointer",
                background: !readIds.has(record.id) ? "#fffbf0" : undefined,
                fontWeight: !readIds.has(record.id) ? 500 : undefined,
              },
              onClick: async () => {
                if (!readIds.has(record.id)) {
                  markBookingRead(record.id).catch(() => undefined);
                  setReadIds((prev) => new Set([...prev, record.id]));
                  setStats((prev) => ({
                    ...prev,
                    unread_count: Math.max(0, prev.unread_count - 1),
                  }));
                }
                window.location.href = `/admin/${record.id}`;
              },
            })}
          />
        </Card>
      </Space>

      {/* ── Create Booking Modal ───────────────────────────────────────────── */}
      <Modal
        title="Tambah Booking Baru"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width="min(720px, calc(100vw - 32px))"
        destroyOnHidden
        styles={{
          body: {
            maxHeight: "80vh",
            overflowY: "auto",
            padding: 0,
          },
        }}
      >
        <BookingFormSimple
          hideHeader={true}
          onSuccess={() => {
            setTimeout(() => {
              setCreateOpen(false);
              fetchBookings();
            }, 2500);
          }}
        />
      </Modal>
    </>
  );
}

export default function AdminBookingList() {
  return (
    <AdminLayout activeKey="bookings">
      <AdminBookingListContent />
    </AdminLayout>
  );
}
