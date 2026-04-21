import { useEffect, useState } from "react";
import {
  Form,
  Input,
  DatePicker,
  TimePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  Divider,
} from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  SaveOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

const { Text } = Typography;

// ── Internal form shape (dayjs objects for pickers) ───────────────────────────

interface HandoverFormValues {
  ci_date?: Dayjs;
  ci_time?: Dayjs;
  ci_petugas?: string;
  ci_kondisi?: string;
  co_date?: Dayjs;
  co_time?: Dayjs;
  co_petugas?: string;
  co_kondisi?: string;
  notes?: string;
}

// ── Sub-component: one side of the handover form ─────────────────────────────

interface HandoverCardProps {
  prefix: "ci" | "co";
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  disabledDate?: (d: Dayjs) => boolean;
}

function HandoverCard({
  prefix,
  title,
  icon,
  accentColor,
  disabledDate,
}: HandoverCardProps) {
  return (
    <Card
      style={{
        borderRadius: 10,
        borderTop: `3px solid ${accentColor}`,
        height: "100%",
      }}
      styles={{ body: { paddingTop: 20 } }}
    >
      <Space style={{ marginBottom: 20 }}>
        <span style={{ color: accentColor, fontSize: 18 }}>{icon}</span>
        <Text strong style={{ fontSize: 15 }}>
          {title}
        </Text>
      </Space>

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={`${prefix}_date`}
            label="Tanggal"
            style={{ marginBottom: 12 }}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD MMMM YYYY"
              placeholder="Pilih tanggal"
              disabledDate={disabledDate}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={`${prefix}_time`}
            label="Jam"
            style={{ marginBottom: 12 }}
          >
            <TimePicker
              style={{ width: "100%" }}
              format="HH:mm"
              placeholder="Pilih jam"
              minuteStep={5}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name={`${prefix}_petugas`}
        label="Petugas"
        style={{ marginBottom: 12 }}
      >
        <Input placeholder="Nama petugas yang melakukan serah terima" />
      </Form.Item>

      <Form.Item
        name={`${prefix}_kondisi`}
        label="Kondisi Ruangan"
        style={{ marginBottom: 0 }}
        tooltip="Deskripsikan kondisi umum: kebersihan, kelengkapan furniture, peralatan, dll."
      >
        <Input.TextArea
          rows={4}
          placeholder={
            prefix === "ci"
              ? "Contoh: Ruangan bersih, AC berfungsi, 2 kursi tanpa sandaran, lampu sorot OK..."
              : "Contoh: Ruangan dikembalikan bersih, tidak ada kerusakan baru, 1 kabel hilang..."
          }
        />
      </Form.Item>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BookingHandoverTabProps {
  bookingId: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export default function BookingHandoverTab({
  bookingId,
  startDate,
  startTime,
  endDate,
  endTime,
}: BookingHandoverTabProps) {
  const [form] = Form.useForm<HandoverFormValues>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      ci_date: dayjs(startDate),
      ci_time: dayjs(startTime, "HH:mm"),
      co_date: dayjs(endDate),
      co_time: dayjs(endTime, "HH:mm"),
    });
  }, [startDate, startTime, endDate, endTime]);

  const disabledDate = (d: Dayjs) =>
    d.isBefore(dayjs(startDate), "day") || d.isAfter(dayjs(endDate), "day");

  const handleSave = async () => {
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      // TODO: wire to POST/PUT /api/bookings/:id/handover
      // Serialise dayjs fields:
      // {
      //   checkin:  { date: values.ci_date?.format('YYYY-MM-DD'), time: values.ci_time?.format('HH:mm'), ... },
      //   checkout: { date: values.co_date?.format('YYYY-MM-DD'), ... },
      //   notes: values.notes,
      // }
      console.debug("[Form B] Handover data for booking", bookingId, values);
      await new Promise((r) => setTimeout(r, 400)); // simulate network
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <HandoverCard
            prefix="ci"
            title="Check-in"
            icon={<LoginOutlined />}
            accentColor="#22c55e"
            disabledDate={disabledDate}
          />
        </Col>
        <Col xs={24} md={12}>
          <HandoverCard
            prefix="co"
            title="Check-out"
            icon={<LogoutOutlined />}
            accentColor="#f59e0b"
            disabledDate={disabledDate}
          />
        </Col>
      </Row>

      <Divider style={{ margin: "20px 0 16px" }} />

      {/* General notes */}
      <Card
        size="small"
        style={{ borderRadius: 10, background: "#fafafa" }}
        title={
          <Space>
            <FileTextOutlined style={{ color: "#6b7280" }} />
            <Text style={{ fontSize: 13 }}>Catatan Umum</Text>
          </Space>
        }
      >
        <Form.Item name="notes" style={{ marginBottom: 0 }}>
          <Input.TextArea
            rows={3}
            placeholder="Catatan tambahan mengenai proses serah terima, hal-hal yang perlu ditindaklanjuti, dll."
          />
        </Form.Item>
      </Card>

      {/* Footer actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
        }}
      >
        {saved && (
          <Alert
            type="success"
            message="Data serah terima disimpan."
            showIcon
            style={{ padding: "4px 12px" }}
          />
        )}
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          Simpan Serah Terima
        </Button>
      </div>
    </Form>
  );
}
