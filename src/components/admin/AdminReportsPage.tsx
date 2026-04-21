import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Space,
  Button,
  Table,
  Tag,
  Spin,
  Alert,
  Divider,
  DatePicker,
  ConfigProvider,
} from "antd";
import type { Dayjs } from "dayjs";
import {
  FilePdfOutlined,
  FileExcelOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import AdminLayout, { useAdminAuth } from "../layout/AdminLayout";

const { RangePicker } = DatePicker;

// ── Light theme config ─────────────────────────────────────────────────────────
const lightTheme = {
  token: {
    colorPrimary: "#0ea5e9",
    colorBgContainer: "#ffffff",
    colorBorder: "#e2e8f0",
    colorText: "#0f172a",
    colorTextSecondary: "#64748b",
    borderRadius: 8,
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  components: {
    Card: {
      colorBorderSecondary: "#e2e8f0",
      boxShadowTertiary:
        "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    },
    Table: {
      headerBg: "#f8fafc",
      borderColor: "#e2e8f0",
      rowHoverBg: "#f8fafc",
    },
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReportData {
  overview: {
    total_bookings: number;
    approved: number;
    pending: number;
    rejected: number;
    finished: number;
    in_progress: number;
    new_this_period: number;
    vs_prev_period: number;
  };
  revenue: {
    estimated_total: number;
    by_room: Array<{
      room_id: number;
      room_name: string;
      total: number;
      count: number;
    }>;
  };
  daily_bookings: Array<{
    date: string;
    count: number;
    approved: number;
    rejected: number;
  }>;
  rooms_ranking: Array<{
    room_id: number;
    room_name: string;
    count: number;
    approved: number;
  }>;
  status_breakdown: Array<{ status: string; count: number }>;
  applicant_type_breakdown: Array<{ type: string; count: number }>;
  company_breakdown: Array<{
    company: string;
    count: number;
    approved: number;
  }>;
  companies: string[];
  inventory_summary: {
    total_items: number;
    damaged: number;
    in_service: number;
    expiring_warranty: number;
  };
}

interface BookingListItem {
  booking_id: string;
  applicant_name: string;
  company_name: string | null;
  room_name: string;
  booking_date: string;
  start_hour: string;
  end_hour: string;
  status: string;
}

type RoomTableRow = {
  room_id: number;
  room_name: string;
  count: number;
  approved: number;
  total: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  in_progress: "Dalam Proses",
  approved: "Disetujui",
  rejected: "Ditolak",
  finished: "Selesai",
};
const STATUS_HEX: Record<string, string> = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  approved: "#10b981",
  rejected: "#ef4444",
  finished: "#8b5cf6",
};
const APPLICANT_COLORS: Record<string, string> = {
  personal: "#f59e0b",
  company: "#3b82f6",
};
const APPLICANT_LABELS: Record<string, string> = {
  personal: "Pribadi",
  company: "Perusahaan",
};

// Quick-select presets for RangePicker
const RANGE_PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  {
    label: "Bulan Ini",
    value: [dayjs().startOf("month"), dayjs().endOf("month")],
  },
  {
    label: "Bulan Lalu",
    value: [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ],
  },
  {
    label: "3 Bulan Terakhir",
    value: [
      dayjs().subtract(2, "month").startOf("month"),
      dayjs().endOf("month"),
    ],
  },
  {
    label: "6 Bulan Terakhir",
    value: [
      dayjs().subtract(5, "month").startOf("month"),
      dayjs().endOf("month"),
    ],
  },
  {
    label: "Tahun Ini",
    value: [dayjs().startOf("year"), dayjs().endOf("year")],
  },
];

// Shared pagination showTotal formatter (pageSize hardcoded to 10 across all tables)
function paginationTotal(total: number, range: [number, number]): string {
  const pageSize = 10;
  const pageNum = Math.ceil(range[1] / pageSize);
  const totalPages = Math.ceil(total / pageSize) || 1;
  return `${total} hasil ditemukan : Halaman ${pageNum} dari ${totalPages}`;
}

// Tooltip style shared across all Recharts charts
const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    color: "#0f172a",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: "#64748b", marginBottom: 4 },
  cursor: { fill: "rgba(0,0,0,0.03)" },
};

// Custom stat card for the overview section
interface StatCardProps {
  title: string;
  value: number;
  accentColor: string;
  suffix?: React.ReactNode;
  footnote?: React.ReactNode;
}

function StatCard({
  title,
  value,
  accentColor,
  suffix,
  footnote,
}: StatCardProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 10,
        padding: "16px 20px",
        border: "1px solid #e2e8f0",
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontFamily: '"Inter", sans-serif',
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: accentColor,
          fontSize: 30,
          fontFamily: '"Inter", system-ui, sans-serif',
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.15,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        {value.toLocaleString("id-ID")}
        {suffix}
      </div>
      {footnote && (
        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
          {footnote}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

function AdminReportsContent() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [company, setCompany] = useState<string>("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // ── View mode state ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [tableSubView, setTableSubView] = useState<
    "per_booking" | "per_room" | "per_company"
  >("per_booking");

  // ── Booking list state (per_booking sub-view — server-side paginated) ──────
  const [bookingList, setBookingList] = useState<BookingListItem[]>([]);
  const [bookingListTotal, setBookingListTotal] = useState(0);
  const [bookingListPage, setBookingListPage] = useState(1);
  const [bookingListLoading, setBookingListLoading] = useState(false);

  const auth = useAdminAuth();
  const userRole = auth?.userRole;
  const canAccess = userRole === "superadmin" || userRole === "manager";

  const dateFrom = dateRange[0].format("YYYY-MM-DD");
  const dateTo = dateRange[1].format("YYYY-MM-DD");

  // ── Fetch summary data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!canAccess) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    if (company) params.set("company", company);
    fetch(`/api/reports/summary?${params.toString()}`)
      .then((r) => r.json() as Promise<ReportData>)
      .then(setData)
      .catch(() => setError("Gagal memuat data laporan."))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, company, canAccess]);

  // ── Reset booking list page when filters or sub-view change ───────────────
  useEffect(() => {
    setBookingListPage(1);
  }, [dateFrom, dateTo, company, tableSubView]);

  // ── Fetch booking list (only when table mode + per_booking active) ─────────
  useEffect(() => {
    if (!canAccess) return;
    if (viewMode !== "table" || tableSubView !== "per_booking") return;
    setBookingListLoading(true);
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      page: String(bookingListPage),
      limit: "10",
    });
    if (company) params.set("company", company);
    fetch(`/api/reports/bookings?${params.toString()}`)
      .then(
        (r) => r.json() as Promise<{ data: BookingListItem[]; total: number }>,
      )
      .then((res) => {
        setBookingList(res.data ?? []);
        setBookingListTotal(res.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setBookingListLoading(false));
  }, [
    viewMode,
    tableSubView,
    dateFrom,
    dateTo,
    company,
    bookingListPage,
    canAccess,
  ]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const rangeLen = dateRange[1].diff(dateRange[0], "day") + 1;
  const xInterval =
    rangeLen > 90 ? Math.floor(rangeLen / 15) : rangeLen > 31 ? 3 : 0;

  const dailyChartData = (data?.daily_bookings ?? []).map((d) => ({
    ...d,
    label: dayjs(d.date).format(rangeLen > 60 ? "D/M" : "DD/MM"),
  }));

  const applicantChartData = (data?.applicant_type_breakdown ?? []).map(
    (d) => ({
      ...d,
      label: APPLICANT_LABELS[d.type] ?? d.type,
    }),
  );

  const statusChartData = (data?.status_breakdown ?? []).map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
  }));

  const vsPrev = data?.overview.vs_prev_period ?? 0;

  // Merge rooms_ranking with revenue.by_room for the per-room table
  const roomTableData: RoomTableRow[] = (data?.rooms_ranking ?? []).map((r) => {
    const rev = (data?.revenue.by_room ?? []).find(
      (rv) => rv.room_id === r.room_id,
    );
    return { ...r, total: rev?.total ?? 0 };
  });

  // ── Revenue table columns (chart mode) ────────────────────────────────────
  const revenueColumns = [
    { title: "Ruangan", dataIndex: "room_name", key: "room_name" },
    {
      title: "Jumlah Booking",
      dataIndex: "count",
      key: "count",
      align: "right" as const,
    },
    {
      title: "Estimasi Revenue",
      dataIndex: "total",
      key: "total",
      align: "right" as const,
      render: (v: number) => (
        <span style={{ color: "#059669", fontVariantNumeric: "tabular-nums" }}>
          {formatRupiah(v)}
        </span>
      ),
    },
  ];

  // ── Table view columns ─────────────────────────────────────────────────────
  const perBookingColumns = [
    {
      title: "No",
      key: "no",
      width: 55,
      render: (_: unknown, __: unknown, index: number) =>
        (bookingListPage - 1) * 10 + index + 1,
    },
    {
      title: "Booking ID",
      dataIndex: "booking_id",
      key: "booking_id",
      width: 150,
      render: (v: string) => (
        <span
          style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}
        >
          {v}
        </span>
      ),
    },
    {
      title: "Nama Penyewa",
      dataIndex: "applicant_name",
      key: "applicant_name",
      sorter: (a: BookingListItem, b: BookingListItem) =>
        a.applicant_name.localeCompare(b.applicant_name),
    },
    {
      title: "Nama Perusahaan",
      dataIndex: "company_name",
      key: "company_name",
      render: (v: string | null) =>
        v ? v : <span style={{ color: "#cbd5e1" }}>—</span>,
    },
    {
      title: "Nama Ruangan",
      dataIndex: "room_name",
      key: "room_name",
      sorter: (a: BookingListItem, b: BookingListItem) =>
        a.room_name.localeCompare(b.room_name),
    },
    {
      title: "Tanggal",
      dataIndex: "booking_date",
      key: "booking_date",
      sorter: (a: BookingListItem, b: BookingListItem) =>
        a.booking_date.localeCompare(b.booking_date),
      render: (v: string) => dayjs(v).format("DD-MM-YYYY"),
    },
    {
      title: "Jam",
      key: "jam",
      render: (_: unknown, r: BookingListItem) =>
        `${r.start_hour} – ${r.end_hour}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <Tag
          style={{
            background: `${STATUS_HEX[v] ?? "#94a3b8"}18`,
            border: `1px solid ${STATUS_HEX[v] ?? "#94a3b8"}40`,
            color: STATUS_HEX[v] ?? "#64748b",
            borderRadius: 6,
            fontWeight: 500,
            fontSize: 11,
          }}
        >
          {STATUS_LABELS[v] ?? v}
        </Tag>
      ),
    },
  ];

  const perRoomColumns = [
    {
      title: "No",
      key: "no",
      width: 55,
      render: (_: unknown, __: unknown, i: number) => i + 1,
    },
    {
      title: "Nama Ruangan",
      dataIndex: "room_name",
      key: "room_name",
      sorter: (a: RoomTableRow, b: RoomTableRow) =>
        a.room_name.localeCompare(b.room_name),
    },
    {
      title: "Total Booking",
      dataIndex: "count",
      key: "count",
      align: "right" as const,
      sorter: (a: RoomTableRow, b: RoomTableRow) => a.count - b.count,
    },
    {
      title: "Booking Disetujui",
      dataIndex: "approved",
      key: "approved",
      align: "right" as const,
      sorter: (a: RoomTableRow, b: RoomTableRow) => a.approved - b.approved,
      render: (v: number) => <span style={{ color: "#059669" }}>{v}</span>,
    },
    {
      title: "Estimasi Revenue",
      dataIndex: "total",
      key: "total",
      align: "right" as const,
      sorter: (a: RoomTableRow, b: RoomTableRow) => a.total - b.total,
      render: (v: number) => (
        <span style={{ color: "#059669", fontVariantNumeric: "tabular-nums" }}>
          {formatRupiah(v)}
        </span>
      ),
    },
  ];

  const perCompanyColumns = [
    {
      title: "No",
      key: "no",
      width: 55,
      render: (_: unknown, __: unknown, i: number) => i + 1,
    },
    {
      title: "Nama Perusahaan",
      dataIndex: "company",
      key: "company",
      sorter: (a: { company: string }, b: { company: string }) =>
        a.company.localeCompare(b.company),
    },
    {
      title: "Total Booking",
      dataIndex: "count",
      key: "count",
      align: "right" as const,
      sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
    },
    {
      title: "Booking Disetujui",
      dataIndex: "approved",
      key: "approved",
      align: "right" as const,
      sorter: (a: { approved: number }, b: { approved: number }) =>
        a.approved - b.approved,
      render: (v: number) => <span style={{ color: "#059669" }}>{v}</span>,
    },
  ];

  // ── Export ─────────────────────────────────────────────────────────────────
  async function handleExport(type: "pdf" | "excel") {
    if (!data) return;
    setExporting(type);

    if (type === "excel") {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const suffix = company ? `-${company.replace(/[^a-zA-Z0-9]/g, "_")}` : "";

      if (tableSubView === "per_booking") {
        // Fetch all data without pagination for export
        const params = new URLSearchParams({
          date_from: dateFrom,
          date_to: dateTo,
          page: "1",
          limit: "9999",
        });
        if (company) params.set("company", company);
        const res = await fetch(
          `/api/reports/bookings?${params.toString()}`,
        ).then(
          (r) =>
            r.json() as Promise<{ data: BookingListItem[]; total: number }>,
        );
        const rows = (res.data ?? []).map(
          (item: BookingListItem, i: number) => ({
            No: i + 1,
            "Booking ID": item.booking_id,
            "Nama Penyewa": item.applicant_name,
            "Nama Perusahaan": item.company_name ?? "",
            "Nama Ruangan": item.room_name,
            "Tanggal Booking": dayjs(item.booking_date).format("DD-MM-YYYY"),
            Jam: `${item.start_hour} – ${item.end_hour}`,
            Status: STATUS_LABELS[item.status] ?? item.status,
          }),
        );
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          "Per Booking",
        );
      } else if (tableSubView === "per_room") {
        const rows = roomTableData.map((r, i) => ({
          No: i + 1,
          "Nama Ruangan": r.room_name,
          "Total Booking": r.count,
          "Booking Disetujui": r.approved,
          "Estimasi Revenue": r.total,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          "Rekap per Ruangan",
        );
      } else {
        const rows = (data.company_breakdown ?? []).map((r, i) => ({
          No: i + 1,
          "Nama Perusahaan": r.company,
          "Total Booking": r.count,
          "Booking Disetujui": r.approved,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(rows),
          "Rekap per Perusahaan",
        );
      }

      XLSX.writeFile(
        wb,
        `laporan-booking-${dateFrom}-sd-${dateTo}${suffix}.xlsx`,
      );
      setExporting(null);
      return;
    }

    if (type === "pdf") {
      window.print();
      setExporting(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!auth)
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" />
      </div>
    );

  if (!canAccess) {
    return (
      <Alert
        type="error"
        showIcon
        message="Akses Ditolak"
        description="Halaman Laporan hanya tersedia untuk superadmin dan manager."
        style={{ marginTop: 24 }}
      />
    );
  }

  return (
    <ConfigProvider theme={lightTheme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @media print {
          .no-print { display: none !important; }
        }

        .report-striped-row > td {
          background-color: #f8fafc !important;
        }

        .reports-page-wrap .ant-table-wrapper .ant-table-thead > tr > th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          color: #94a3b8;
        }
      `}</style>

      <div className="reports-page-wrap">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
          <div className="no-print" style={{ marginBottom: 8 }}>
            {/* Row 1: Title + View Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: 0,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  Laporan
                </h1>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    margin: "4px 0 0 0",
                  }}
                >
                  Ringkasan aktivitas booking dan operasional
                </p>
              </div>

              {/* View Toggle — custom pill */}
              <div
                style={{
                  display: "inline-flex",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: 3,
                  gap: 2,
                }}
              >
                {(["table", "chart"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      transition: "all 0.15s ease",
                      background: viewMode === mode ? "#ffffff" : "transparent",
                      color: viewMode === mode ? "#0f172a" : "#64748b",
                      boxShadow:
                        viewMode === mode
                          ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
                          : "none",
                    }}
                  >
                    {mode === "chart" ? "📊 Grafik" : "📋 Tabel"}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Filter Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                Filter:
              </span>

              <RangePicker
                value={dateRange}
                onChange={(vals) => {
                  if (vals?.[0] && vals?.[1]) setDateRange([vals[0], vals[1]]);
                }}
                presets={RANGE_PRESETS}
                format="DD/MM/YYYY"
                allowClear={false}
                size="small"
                style={{ borderRadius: 6 }}
              />

              <span
                style={{
                  width: 1,
                  height: 20,
                  background: "#e2e8f0",
                  display: "inline-block",
                }}
              />

              <Select
                value={company || undefined}
                onChange={(v) => setCompany(v ?? "")}
                allowClear
                showSearch
                placeholder="Semua Perusahaan"
                size="small"
                style={{ minWidth: 200, borderRadius: 6 }}
                options={(data?.companies ?? []).map((c) => ({
                  value: c,
                  label: c,
                }))}
                filterOption={(input, opt) =>
                  String(opt?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />

              {company && (
                <Tag
                  closable
                  onClose={() => setCompany("")}
                  color="blue"
                  style={{ borderRadius: 6, margin: 0 }}
                >
                  {company}
                </Tag>
              )}

              <div style={{ flex: 1 }} />

              {viewMode === "chart" ? (
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport("pdf")}
                  loading={exporting === "pdf"}
                  disabled={!data}
                  size="small"
                  danger
                  style={{ borderRadius: 6 }}
                >
                  Export PDF
                </Button>
              ) : (
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport("excel")}
                  loading={exporting === "excel"}
                  disabled={!data}
                  size="small"
                  type="primary"
                  style={{
                    borderRadius: 6,
                    background: "#059669",
                    borderColor: "#059669",
                  }}
                >
                  Export Excel
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Spin size="large" />
            </div>
          )}
          {!loading && error && <Alert type="error" message={error} showIcon />}

          {!loading && !error && data && (
            <>
              {/* ── OVERVIEW CARDS ──────────────────────────────────────────── */}
              <Row gutter={[12, 12]}>
                {[
                  {
                    title: "Total Booking",
                    value: data.overview.total_bookings,
                    color: "#0f172a",
                  },
                  {
                    title: "Disetujui",
                    value: data.overview.approved,
                    color: "#059669",
                  },
                  {
                    title: "Menunggu",
                    value: data.overview.pending,
                    color: "#d97706",
                  },
                  {
                    title: "Ditolak",
                    value: data.overview.rejected,
                    color: "#dc2626",
                  },
                  {
                    title: "Selesai",
                    value: data.overview.finished,
                    color: "#7c3aed",
                  },
                ].map(({ title, value, color }) => (
                  <Col key={title} xs={12} sm={8} lg={4}>
                    <StatCard title={title} value={value} accentColor={color} />
                  </Col>
                ))}
                <Col xs={12} sm={8} lg={4}>
                  <StatCard
                    title="Periode Ini"
                    value={data.overview.new_this_period}
                    accentColor="#0ea5e9"
                    suffix={
                      vsPrev !== 0 ? (
                        <span
                          style={{
                            fontSize: 14,
                            color: vsPrev > 0 ? "#059669" : "#dc2626",
                            fontWeight: 500,
                          }}
                        >
                          {vsPrev > 0 ? (
                            <ArrowUpOutlined />
                          ) : (
                            <ArrowDownOutlined />
                          )}{" "}
                          {Math.abs(vsPrev)}
                        </span>
                      ) : undefined
                    }
                    footnote={`vs sebelumnya: ${vsPrev >= 0 ? "+" : ""}${vsPrev}`}
                  />
                </Col>
              </Row>

              {/* ── TABLE VIEW ──────────────────────────────────────────────── */}
              {viewMode === "table" && (
                <div className="no-print">
                  {/* Underline sub-view tabs — above the Card */}
                  <div
                    style={{
                      display: "flex",
                      gap: 0,
                      borderBottom: "1px solid #e2e8f0",
                      marginBottom: 0,
                      background: "#ffffff",
                      borderRadius: "8px 8px 0 0",
                      borderTop: "1px solid #e2e8f0",
                      borderLeft: "1px solid #e2e8f0",
                      borderRight: "1px solid #e2e8f0",
                      paddingLeft: 4,
                    }}
                  >
                    {(
                      [
                        { key: "per_booking", label: "Per Booking" },
                        { key: "per_room", label: "Rekap per Ruangan" },
                        { key: "per_company", label: "Rekap per Perusahaan" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setTableSubView(tab.key)}
                        style={{
                          padding: "10px 18px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: tableSubView === tab.key ? 600 : 400,
                          color:
                            tableSubView === tab.key ? "#0ea5e9" : "#64748b",
                          borderBottom:
                            tableSubView === tab.key
                              ? "2px solid #0ea5e9"
                              : "2px solid transparent",
                          marginBottom: -1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <Card
                    size="small"
                    style={{
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      borderTop: "none",
                    }}
                  >
                    {/* Per Booking — server-side paginated */}
                    {tableSubView === "per_booking" && (
                      <Table
                        dataSource={bookingList}
                        columns={perBookingColumns}
                        rowKey="booking_id"
                        loading={bookingListLoading}
                        size="small"
                        rowClassName={(_, i) =>
                          i % 2 === 1 ? "report-striped-row" : ""
                        }
                        pagination={{
                          current: bookingListPage,
                          pageSize: 10,
                          total: bookingListTotal,
                          onChange: setBookingListPage,
                          showTotal: paginationTotal,
                          showSizeChanger: false,
                        }}
                        locale={{
                          emptyText: "Tidak ada data booking pada periode ini",
                        }}
                        scroll={{ x: "max-content" }}
                      />
                    )}

                    {/* Rekap per Ruangan — client-side paginated */}
                    {tableSubView === "per_room" && (
                      <Table
                        dataSource={roomTableData}
                        columns={perRoomColumns}
                        rowKey="room_id"
                        size="small"
                        rowClassName={(_, i) =>
                          i % 2 === 1 ? "report-striped-row" : ""
                        }
                        pagination={{
                          pageSize: 10,
                          showTotal: paginationTotal,
                          showSizeChanger: false,
                        }}
                        locale={{ emptyText: "Tidak ada data per ruangan" }}
                      />
                    )}

                    {/* Rekap per Perusahaan — client-side paginated */}
                    {tableSubView === "per_company" && (
                      <Table
                        dataSource={data.company_breakdown}
                        columns={perCompanyColumns}
                        rowKey="company"
                        size="small"
                        rowClassName={(_, i) =>
                          i % 2 === 1 ? "report-striped-row" : ""
                        }
                        pagination={{
                          pageSize: 10,
                          showTotal: paginationTotal,
                          showSizeChanger: false,
                        }}
                        locale={{ emptyText: "Tidak ada data per perusahaan" }}
                      />
                    )}
                  </Card>
                </div>
              )}

              {/* ── CHART VIEW ──────────────────────────────────────────────── */}
              {viewMode === "chart" && (
                <>
                  {/* Charts Row 1: Daily + Status */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={14}>
                      <Card
                        title={
                          <span
                            style={{
                              color: "#0f172a",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Booking Harian
                          </span>
                        }
                        size="small"
                      >
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={dailyChartData}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              axisLine={{ stroke: "#e2e8f0" }}
                              tickLine={false}
                              interval={xInterval}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip {...CHART_TOOLTIP_STYLE} />
                            <Legend
                              wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                            />
                            <Bar
                              dataKey="count"
                              name="Total"
                              fill="#f59e0b"
                              radius={[3, 3, 0, 0]}
                            />
                            <Bar
                              dataKey="approved"
                              name="Disetujui"
                              fill="#059669"
                              radius={[3, 3, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                    <Col xs={24} lg={10}>
                      <Card
                        title={
                          <span
                            style={{
                              color: "#0f172a",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Status Booking
                          </span>
                        }
                        size="small"
                      >
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              dataKey="count"
                              nameKey="label"
                              cx="50%"
                              cy="45%"
                              innerRadius={60}
                              outerRadius={100}
                              label={({
                                label,
                                percent,
                              }: {
                                label?: string;
                                percent?: number;
                              }) =>
                                (percent ?? 0) > 0
                                  ? `${label} ${((percent ?? 0) * 100).toFixed(0)}%`
                                  : ""
                              }
                              labelLine={false}
                            >
                              {statusChartData.map((entry) => (
                                <Cell
                                  key={entry.status}
                                  fill={STATUS_HEX[entry.status] ?? "#94a3b8"}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              {...CHART_TOOLTIP_STYLE}
                              formatter={(v) => [Number(v ?? 0), "Booking"]}
                            />
                            <Legend
                              formatter={(v) => v}
                              wrapperStyle={{
                                fontSize: 12,
                                paddingTop: 8,
                                color: "#64748b",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                  </Row>

                  {/* Charts Row 2: Rooms + Applicant type */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card
                        title={
                          <span
                            style={{
                              color: "#0f172a",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Ruangan Terpopuler
                          </span>
                        }
                        size="small"
                      >
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            layout="vertical"
                            data={data.rooms_ranking}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f1f5f9"
                            />
                            <YAxis
                              type="category"
                              dataKey="room_name"
                              width={110}
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <XAxis
                              type="number"
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              axisLine={{ stroke: "#e2e8f0" }}
                              tickLine={false}
                            />
                            <Tooltip {...CHART_TOOLTIP_STYLE} />
                            <Bar
                              dataKey="count"
                              name="Booking"
                              fill="#0ea5e9"
                              radius={[0, 3, 3, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card
                        title={
                          <span
                            style={{
                              color: "#0f172a",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Tipe Pemohon
                          </span>
                        }
                        size="small"
                      >
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={applicantChartData}
                              dataKey="count"
                              nameKey="label"
                              cx="50%"
                              cy="45%"
                              outerRadius={90}
                              label={({
                                label,
                                percent,
                              }: {
                                label?: string;
                                percent?: number;
                              }) =>
                                (percent ?? 0) > 0
                                  ? `${label} ${((percent ?? 0) * 100).toFixed(0)}%`
                                  : ""
                              }
                            >
                              {applicantChartData.map((entry) => (
                                <Cell
                                  key={entry.type}
                                  fill={
                                    APPLICANT_COLORS[entry.type] ?? "#94a3b8"
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              {...CHART_TOOLTIP_STYLE}
                              formatter={(v) => [Number(v ?? 0), "Booking"]}
                            />
                            <Legend
                              wrapperStyle={{
                                fontSize: 12,
                                paddingTop: 8,
                                color: "#64748b",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                  </Row>

                  {/* Company Breakdown */}
                  {data.company_breakdown.length > 0 && (
                    <Card
                      title={
                        <span
                          style={{
                            color: "#0f172a",
                            fontWeight: 600,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          Breakdown Perusahaan
                        </span>
                      }
                      size="small"
                    >
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(
                          200,
                          data.company_breakdown.length * 36,
                        )}
                      >
                        <BarChart
                          layout="vertical"
                          data={data.company_breakdown}
                          margin={{ top: 5, right: 20, left: 8, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                          />
                          <YAxis
                            type="category"
                            dataKey="company"
                            width={160}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: string) =>
                              v.length > 22 ? v.slice(0, 20) + "…" : v
                            }
                          />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={{ stroke: "#e2e8f0" }}
                            tickLine={false}
                          />
                          <Tooltip {...CHART_TOOLTIP_STYLE} />
                          <Legend
                            wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                          />
                          <Bar
                            dataKey="count"
                            name="Total Booking"
                            fill="#6366f1"
                            radius={[0, 3, 3, 0]}
                          />
                          <Bar
                            dataKey="approved"
                            name="Disetujui"
                            fill="#059669"
                            radius={[0, 3, 3, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Revenue */}
                  <Card
                    title={
                      <Space>
                        <span
                          style={{
                            color: "#0f172a",
                            fontWeight: 600,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          Estimasi Revenue
                        </span>
                        <Tag
                          style={{
                            background: "#fef3c7",
                            border: "1px solid #fde68a",
                            color: "#92400e",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                        >
                          Pending — berdasarkan base price
                        </Tag>
                      </Space>
                    }
                    size="small"
                  >
                    <Statistic
                      value={data.revenue.estimated_total}
                      formatter={(v) => formatRupiah(Number(v))}
                      valueStyle={{
                        fontSize: 32,
                        color: "#059669",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    />
                    <Divider
                      style={{
                        marginTop: 12,
                        marginBottom: 12,
                        borderColor: "#e2e8f0",
                      }}
                    />
                    <Table
                      dataSource={data.revenue.by_room}
                      columns={revenueColumns}
                      rowKey="room_id"
                      size="small"
                      pagination={false}
                      locale={{
                        emptyText: "Belum ada data revenue pada periode ini",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        display: "block",
                        marginTop: 8,
                      }}
                    >
                      * Estimasi berdasarkan base price ruangan. Angka final
                      dapat berbeda sesuai negosiasi.
                    </div>
                  </Card>

                  {/* Inventaris */}
                  <Card
                    title={
                      <span
                        style={{
                          color: "#0f172a",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Ringkasan Inventaris
                      </span>
                    }
                    size="small"
                  >
                    <Row gutter={[12, 12]}>
                      {[
                        {
                          title: "Total Item",
                          value: data.inventory_summary.total_items,
                          color: "#0f172a",
                        },
                        {
                          title: "Item Rusak",
                          value: data.inventory_summary.damaged,
                          color:
                            data.inventory_summary.damaged > 0
                              ? "#dc2626"
                              : "#0f172a",
                        },
                        {
                          title: "Dalam Servis",
                          value: data.inventory_summary.in_service,
                          color:
                            data.inventory_summary.in_service > 0
                              ? "#d97706"
                              : "#0f172a",
                        },
                        {
                          title: "Garansi Hampir Habis",
                          value: data.inventory_summary.expiring_warranty,
                          color:
                            data.inventory_summary.expiring_warranty > 0
                              ? "#dc2626"
                              : "#0f172a",
                        },
                      ].map(({ title, value, color }) => (
                        <Col key={title} xs={12} sm={6}>
                          <StatCard
                            title={title}
                            value={value}
                            accentColor={color}
                            footnote={
                              title === "Garansi Hampir Habis" && value > 0 ? (
                                <a
                                  href="/admin/inventory"
                                  style={{ color: "#0ea5e9", fontSize: 11 }}
                                >
                                  Lihat →
                                </a>
                              ) : undefined
                            }
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}

export default function AdminReportsPage() {
  return (
    <AdminLayout activeKey="reports">
      <AdminReportsContent />
    </AdminLayout>
  );
}
