import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Card, Row, Col, Statistic, Select, Space, Button, Table, Tag,
  Typography, Spin, Alert, Divider,
} from 'antd';
import {
  DownloadOutlined, FilePdfOutlined, FileExcelOutlined,
  ArrowUpOutlined, ArrowDownOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminLayout from '../layout/AdminLayout';
import PageHeader from '../ui/PageHeader';
import { ADMIN_USERNAME_KEY, ADMIN_PASSWORD_KEY, ADMIN_ROLE_KEY } from '../../lib/constants';

const { Text } = Typography;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReportData {
  overview: {
    total_bookings:  number;
    approved:        number;
    pending:         number;
    rejected:        number;
    finished:        number;
    in_progress:     number;
    new_this_month:  number;
    vs_last_month:   number;
  };
  revenue: {
    estimated_total: number;
    by_room: Array<{
      room_id:   number;
      room_name: string;
      total:     number;
      count:     number;
    }>;
  };
  daily_bookings: Array<{
    date:     string;
    count:    number;
    approved: number;
    rejected: number;
  }>;
  rooms_ranking: Array<{
    room_id:   number;
    room_name: string;
    count:     number;
    approved:  number;
  }>;
  status_breakdown: Array<{
    status: string;
    count:  number;
  }>;
  applicant_type_breakdown: Array<{
    type:  string;
    count: number;
  }>;
  inventory_summary: {
    total_items:       number;
    damaged:           number;
    in_service:        number;
    expiring_warranty: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function adminHeaders(): HeadersInit {
  if (typeof localStorage === 'undefined') return {};
  return {
    'x-admin-username': localStorage.getItem(ADMIN_USERNAME_KEY) ?? '',
    'x-admin-password': localStorage.getItem(ADMIN_PASSWORD_KEY) ?? '',
  };
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  pending:     'Menunggu',
  in_progress: 'Dalam Proses',
  approved:    'Disetujui',
  rejected:    'Ditolak',
  finished:    'Selesai',
};

const STATUS_HEX: Record<string, string> = {
  pending:     '#d97706',
  in_progress: '#2563eb',
  approved:    '#059669',
  rejected:    '#dc2626',
  finished:    '#7c3aed',
};

const APPLICANT_COLORS: Record<string, string> = {
  personal: '#d97706',
  company:  '#2563eb',
};

const APPLICANT_LABELS: Record<string, string> = {
  personal: 'Pribadi',
  company:  'Perusahaan',
};

const MONTH_OPTIONS = [
  { value: 1,  label: 'Januari'   },
  { value: 2,  label: 'Februari'  },
  { value: 3,  label: 'Maret'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'Mei'       },
  { value: 6,  label: 'Juni'      },
  { value: 7,  label: 'Juli'      },
  { value: 8,  label: 'Agustus'   },
  { value: 9,  label: 'September' },
  { value: 10, label: 'Oktober'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'Desember'  },
];

const YEAR_OPTIONS = Array.from(
  { length: dayjs().year() - 2023 },
  (_, i) => ({ value: 2024 + i, label: String(2024 + i) }),
);

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [year,      setYear]      = useState<number>(dayjs().year());
  const [month,     setMonth]     = useState<number>(dayjs().month() + 1);
  const [data,      setData]      = useState<ReportData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const userRole = typeof localStorage !== 'undefined'
    ? localStorage.getItem(ADMIN_ROLE_KEY)
    : null;
  const canAccess = userRole === 'superadmin' || userRole === 'manager';

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/reports/summary?year=${year}&month=${month}`, {
      headers: adminHeaders(),
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Gagal memuat data laporan.'))
      .finally(() => setLoading(false));
  }, [year, month]);

  async function handleExport(type: 'pdf' | 'excel') {
    if (!data) return;
    setExporting(type);

    if (type === 'excel') {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([data.overview]),
        'Overview',
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data.daily_bookings),
        'Booking Harian',
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data.rooms_ranking),
        'Ruangan',
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([
          { 'Total Estimasi': data.revenue.estimated_total },
          ...data.revenue.by_room,
        ]),
        'Revenue',
      );

      XLSX.writeFile(wb, `laporan-${year}-${String(month).padStart(2, '0')}.xlsx`);
      setExporting(null);
      return;
    }

    if (type === 'pdf') {
      window.print();
      setExporting(null);
    }
  }

  // ── Derived chart data ─────────────────────────────────────────────────────

  const dailyChartData = (data?.daily_bookings ?? []).map(d => ({
    ...d,
    label: dayjs(d.date).format('DD/MM'),
  }));

  const applicantChartData = (data?.applicant_type_breakdown ?? []).map(d => ({
    ...d,
    label: APPLICANT_LABELS[d.type] ?? d.type,
  }));

  const statusChartData = (data?.status_breakdown ?? []).map(d => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
  }));

  const vsLastMonth = data?.overview.vs_last_month ?? 0;

  // ── Revenue table columns ──────────────────────────────────────────────────

  const revenueColumns = [
    {
      title: 'Ruangan',
      dataIndex: 'room_name',
      key: 'room_name',
    },
    {
      title: 'Jumlah Booking',
      dataIndex: 'count',
      key: 'count',
      align: 'right' as const,
    },
    {
      title: 'Estimasi Revenue',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (v: number) => formatRupiah(v),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!canAccess) {
    return (
      <AdminLayout activeKey="reports">
        <Alert
          type="error"
          showIcon
          message="Akses Ditolak"
          description="Anda tidak memiliki akses ke halaman ini. Halaman Laporan hanya tersedia untuk superadmin dan manager."
          style={{ marginTop: 24 }}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeKey="reports">
      <Space direction="vertical" size={20} style={{ width: '100%' }}>

        {/* [A] HEADER */}
        <PageHeader
          title="Laporan"
          subtitle="Ringkasan aktivitas booking dan operasional"
          extra={
            <Space wrap>
              <Select
                value={month}
                onChange={setMonth}
                style={{ width: 130 }}
                options={MONTH_OPTIONS}
              />
              <Select
                value={year}
                onChange={setYear}
                style={{ width: 90 }}
                options={YEAR_OPTIONS}
              />
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => handleExport('excel')}
                loading={exporting === 'excel'}
                disabled={!data}
              >
                Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => handleExport('pdf')}
                loading={exporting === 'pdf'}
                disabled={!data}
                danger
              >
                PDF
              </Button>
            </Space>
          }
        />

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        )}
        {!loading && error && (
          <Alert type="error" message={error} showIcon />
        )}

        {!loading && !error && data && (
          <>
            {/* [B] OVERVIEW CARDS */}
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8} lg={4}>
                <Card size="small">
                  <Statistic
                    title="Total Booking"
                    value={data.overview.total_bookings}
                    valueStyle={{ color: '#374151' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Card size="small">
                  <Statistic
                    title="Disetujui"
                    value={data.overview.approved}
                    valueStyle={{ color: '#059669' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Card size="small">
                  <Statistic
                    title="Menunggu"
                    value={data.overview.pending}
                    valueStyle={{ color: '#d97706' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Card size="small">
                  <Statistic
                    title="Ditolak"
                    value={data.overview.rejected}
                    valueStyle={{ color: '#dc2626' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Card size="small">
                  <Statistic
                    title="Selesai"
                    value={data.overview.finished}
                    valueStyle={{ color: '#2563eb' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Card size="small">
                  <Statistic
                    title="Baru Bulan Ini"
                    value={data.overview.new_this_month}
                    valueStyle={{ color: '#7c3aed' }}
                    suffix={
                      vsLastMonth !== 0 ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: vsLastMonth > 0 ? '#059669' : '#dc2626',
                            marginLeft: 4,
                          }}
                        >
                          {vsLastMonth > 0
                            ? <ArrowUpOutlined />
                            : <ArrowDownOutlined />}
                          {' '}{Math.abs(vsLastMonth)}
                        </Text>
                      ) : undefined
                    }
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    vs bulan lalu: {vsLastMonth >= 0 ? '+' : ''}{vsLastMonth}
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* [C] CHARTS ROW 1 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card title="Booking Harian" size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count"    name="Total"     fill="#d97706" />
                      <Bar dataKey="approved" name="Disetujui" fill="#059669" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col xs={24} lg={10}>
                <Card title="Status Booking" size="small">
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
                        label={({ label, percent }) =>
                          percent > 0 ? `${label} ${(percent * 100).toFixed(0)}%` : ''
                        }
                        labelLine={false}
                      >
                        {statusChartData.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_HEX[entry.status] ?? '#9ca3af'}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Booking']} />
                      <Legend
                        formatter={(value) => value}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            {/* [D] CHARTS ROW 2 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Ruangan Terpopuler" size="small">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      layout="vertical"
                      data={data.rooms_ranking}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <YAxis
                        type="category"
                        dataKey="room_name"
                        width={110}
                        tick={{ fontSize: 11 }}
                      />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Booking" fill="#22d3ee" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Tipe Pemohon" size="small">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={applicantChartData}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        label={({ label, percent }) =>
                          percent > 0 ? `${label} ${(percent * 100).toFixed(0)}%` : ''
                        }
                      >
                        {applicantChartData.map((entry) => (
                          <Cell
                            key={entry.type}
                            fill={APPLICANT_COLORS[entry.type] ?? '#9ca3af'}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Booking']} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            {/* [E] REVENUE CARD */}
            <Card
              title={
                <Space>
                  Estimasi Revenue
                  <Tag color="warning">Pending — berdasarkan base price</Tag>
                </Space>
              }
              size="small"
            >
              <Statistic
                value={data.revenue.estimated_total}
                formatter={(v) => formatRupiah(Number(v))}
                valueStyle={{ fontSize: 28, color: '#059669' }}
              />
              <Divider style={{ marginTop: 12, marginBottom: 12 }} />
              <Table
                dataSource={data.revenue.by_room}
                columns={revenueColumns}
                rowKey="room_id"
                size="small"
                pagination={false}
                locale={{ emptyText: 'Belum ada data revenue bulan ini' }}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                * Estimasi berdasarkan base price ruangan. Angka final dapat berbeda sesuai negosiasi.
              </Text>
            </Card>

            {/* [F] INVENTARIS CARD */}
            <Card title="Ringkasan Inventaris" size="small">
              <Row gutter={[12, 12]}>
                <Col xs={12} sm={6}>
                  <Card size="small" bordered={false} style={{ background: '#f9fafb' }}>
                    <Statistic
                      title="Total Item"
                      value={data.inventory_summary.total_items}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" bordered={false} style={{ background: '#f9fafb' }}>
                    <Statistic
                      title="Item Rusak"
                      value={data.inventory_summary.damaged}
                      valueStyle={data.inventory_summary.damaged > 0 ? { color: '#dc2626' } : undefined}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" bordered={false} style={{ background: '#f9fafb' }}>
                    <Statistic
                      title="Dalam Servis"
                      value={data.inventory_summary.in_service}
                      valueStyle={data.inventory_summary.in_service > 0 ? { color: '#d97706' } : undefined}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" bordered={false} style={{ background: '#f9fafb' }}>
                    <Statistic
                      title="Garansi Hampir Habis"
                      value={data.inventory_summary.expiring_warranty}
                      valueStyle={data.inventory_summary.expiring_warranty > 0 ? { color: '#dc2626' } : undefined}
                      suffix={
                        data.inventory_summary.expiring_warranty > 0 ? (
                          <a
                            href="/admin/inventory"
                            style={{ fontSize: 12, marginLeft: 4 }}
                          >
                            Lihat
                          </a>
                        ) : undefined
                      }
                    />
                  </Card>
                </Col>
              </Row>
            </Card>
          </>
        )}

      </Space>
    </AdminLayout>
  );
}
