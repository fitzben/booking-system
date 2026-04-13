import { useState, useEffect } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Form,
  Input,
  Button,
  DatePicker,
  TimePicker,
  Switch,
  Card,
  Space,
  Alert,
  Typography,
  Result,
  Divider,
  Radio,
  Row,
  Col,
  Checkbox,
  Select,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  SolutionOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { createBooking, getRooms } from "../../lib/api";
import TermsModal from "./TermsModal";
import SOPModal from "./SOPModal";
import type { Room } from "../../lib/api";
import { COLORS } from "../../lib/theme";
import "./BookingFormSimple.css";

const { Title, Text } = Typography;

// ── Config ────────────────────────────────────────────────────────────────────
// Set to true to show a confirmation banner displaying the pre-selected room name
// Set to false to silently pre-select the room without showing it in the form
const SHOW_PRESELECTED_ROOM_BANNER = false;

// ── Validators ────────────────────────────────────────────────────────────────

function processWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

export function validateWhatsapp(_: unknown, value: string) {
  if (!value) return Promise.reject("Nomor WhatsApp wajib diisi");
  if (processWhatsapp(value).length < 10) {
    return Promise.reject(
      "Nomor WhatsApp minimal 10 digit setelah kode negara (+62)",
    );
  }
  if (processWhatsapp(value).length > 13) {
    return Promise.reject(
      "Nomor WhatsApp maksimal 13 digit setelah kode negara (+62)",
    );
  }
  return Promise.resolve();
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = [Dayjs, Dayjs] | null;
type TimeRange = [Dayjs, Dayjs] | null;

interface AvailabilityResult {
  available: boolean;
  full_day_blocked?: boolean;
  message?: string;
  booked_slots?: Array<{ start_time: string; end_time: string }>;
}

type ApplicantType = "personal" | "company";

// ── Component ─────────────────────────────────────────────────────────────────

interface BookingFormSimpleProps {
  onSuccess?: () => void;
  hideHeader?: boolean;
  onSubmittedChange?: (submitted: boolean) => void;
}

export default function BookingFormSimple({
  onSuccess,
  hideHeader = false,
  onSubmittedChange,
}: BookingFormSimpleProps) {
  const [form] = Form.useForm();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [preselectedRoom, setPreselectedRoom] = useState<Room | null>(null); // track if came from room detail

  const [applicantType, setApplicantType] = useState<ApplicantType>("personal");
  const [fullDay, setFullDay] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(null);

  const [availLoading, setAvailLoading] = useState(false);
  const [dateAvail, setDateAvail] = useState<AvailabilityResult | null>(null);
  const [timeAvail, setTimeAvail] = useState<AvailabilityResult | null>(null);

  const [bookedSlots, setBookedSlots] = useState<
    Array<{
      start_time: string;
      end_time: string;
    }>
  >([]);

  const [tosOpen, setTosOpen] = useState(false);
  const [sopOpen, setSopOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileStart, setMobileStart] = useState<Dayjs | null>(null);
  const [mobileEnd, setMobileEnd] = useState<Dayjs | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    getRooms()
      .then((list) => {
        setRooms(list);
        if (list.length === 0) return;

        // Check for pre-selected room from URL param (e.g. /booking?room_id=2)
        const params = new URLSearchParams(window.location.search);
        const paramRoomId = params.get("room_id");
        const matchedRoom = paramRoomId
          ? list.find((r) => String(r.id) === paramRoomId)
          : null;

        const defaultRoom = matchedRoom ?? list[0];
        setSelectedRoomId(defaultRoom.id);
        setPreselectedRoom(matchedRoom ?? null);
        form.setFieldValue("room_id", defaultRoom.id);
      })
      .catch(() => undefined);
  }, []);

  // Computed helpers
  const isSameDay =
    dateRange !== null &&
    dateRange[0].format("YYYY-MM-DD") === dateRange[1].format("YYYY-MM-DD");

  const showTimePicker = !fullDay && dateRange !== null && isSameDay;

  // acknowledged_by: visible when company name contains "MD" as a whole word,
  // or starts with "MD" followed immediately by letters (e.g. "MDTV")
  const companyName = Form.useWatch("company_name", form) ?? "";
  const isMDCompany =
    /\bMD\b/i.test(companyName) || /^MD[A-Z]/i.test(companyName);
  const needsAcknowledged = applicantType === "company" && isMDCompany;

  // ── Availability check — dates ───────────────────────────────────────────

  async function checkDateAvailability(
    roomId: number,
    start: Dayjs,
    end: Dayjs,
  ) {
    const startStr = start.format("YYYY-MM-DD");
    const endStr = end.format("YYYY-MM-DD");
    setAvailLoading(true);
    setDateAvail(null);
    setTimeAvail(null);
    setTimeRange(null);
    form.setFieldValue("time_range", undefined);
    try {
      const res = await fetch(
        `/api/bookings/availability?room_id=${roomId}&start_date=${startStr}&end_date=${endStr}`,
      );
      const data: AvailabilityResult = await res.json();
      setDateAvail(data);
      if (data.booked_slots?.length) {
        setBookedSlots(data.booked_slots);
      } else {
        setBookedSlots([]);
      }
      if (data.full_day_blocked && fullDay) {
        setFullDay(false);
        form.setFieldValue("time_range", undefined);
        setTimeRange(null);
      }
    } catch {
      setDateAvail(null);
      setBookedSlots([]);
    } finally {
      setAvailLoading(false);
    }
  }

  // ── Availability check — time slot ──────────────────────────────────────

  async function checkTimeAvailability(
    roomId: number,
    date: Dayjs,
    start: Dayjs,
    end: Dayjs,
  ) {
    const dateStr = date.format("YYYY-MM-DD");
    const startStr = start.format("HH:mm");
    const endStr = end.format("HH:mm");
    setAvailLoading(true);
    setTimeAvail(null);
    try {
      const res = await fetch(
        `/api/bookings/availability?room_id=${roomId}&start_date=${dateStr}&end_date=${dateStr}&start_time=${startStr}&end_time=${endStr}`,
      );
      const data: AvailabilityResult = await res.json();
      setTimeAvail(data);
    } catch {
      setTimeAvail(null);
    } finally {
      setAvailLoading(false);
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleMobileStartChange(val: Dayjs | null) {
    setMobileStart(val);
    if (val && mobileEnd && mobileEnd.isBefore(val, "day")) {
      setMobileEnd(null);
      form.setFieldValue("end_date_mobile", undefined);
      handleDateChange(null);
      return;
    }
    handleDateChange(val && mobileEnd ? [val, mobileEnd] : null);
  }

  function handleMobileEndChange(val: Dayjs | null) {
    setMobileEnd(val);
    handleDateChange(mobileStart && val ? [mobileStart, val] : null);
  }

  function handleFullDayToggle(checked: boolean) {
    setFullDay(checked);
    setTimeRange(null);
    setTimeAvail(null);
    form.setFieldValue("time_range", undefined);
  }

  function handleDateChange(values: [Dayjs | null, Dayjs | null] | null) {
    setBookedSlots([]);
    if (!values || !values[0] || !values[1]) {
      setDateRange(null);
      setDateAvail(null);
      setTimeAvail(null);
      setTimeRange(null);
      return;
    }
    const [start, end] = values as [Dayjs, Dayjs];
    setDateRange([start, end]);

    if (selectedRoomId) {
      checkDateAvailability(selectedRoomId, start, end);
    }
  }

  function handleTimeChange(values: [Dayjs | null, Dayjs | null] | null) {
    if (!values || !values[0] || !values[1]) {
      setTimeRange(null);
      setTimeAvail(null);
      return;
    }
    const [start, end] = values as [Dayjs, Dayjs];
    setTimeRange([start, end]);

    if (selectedRoomId && dateRange) {
      checkTimeAvailability(selectedRoomId, dateRange[0], start, end);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(values: Record<string, unknown>) {
    if (!dateRange?.[0] || !dateRange?.[1]) return;

    setSubmitError(null);
    setSubmitting(true);

    const startDate = dateRange[0].format("YYYY-MM-DD");
    const endDate = dateRange[1].format("YYYY-MM-DD");
    const startTime =
      fullDay || !isSameDay ? "00:00" : timeRange![0].format("HH:mm");
    const endTime =
      fullDay || !isSameDay ? "23:59" : timeRange![1].format("HH:mm");

    const payload: Record<string, unknown> = {
      room_id: selectedRoomId,
      applicant_type: applicantType,
      applicant_contact: `62${processWhatsapp(String(values["whatsapp"]))}`,
      email: values["email"] ? String(values["email"]) : null,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      is_full_day: fullDay || !isSameDay,
    };

    if (applicantType === "personal") {
      payload.applicant_name = String(values["nama"]);
    } else {
      payload.applicant_name = String(values["pic_name"]);
      payload.organization = String(values["company_name"]);
      payload.position = values["jabatan"] ? String(values["jabatan"]) : null;
    }

    payload.acknowledged_by = String(values["acknowledged_by"] ?? "");

    try {
      const result = await createBooking(payload);
      setBookingCode(result.booking_code ?? null);
      setSubmitted(true);
      onSuccess?.();
      onSubmittedChange?.(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Disabled dates ────────────────────────────────────────────────────────

  function disabledDate(current: Dayjs): boolean {
    return current.isBefore(dayjs().startOf("day"));
  }

  // ── Disabled time ─────────────────────────────────────────────────────────

  function disabledTime() {
    const OPERATING_START = 7; // 07:00
    const OPERATING_END = 19; // 19:00
    const BUFFER_HOURS = 1;

    const outsideHours = [
      ...Array.from({ length: OPERATING_START }, (_, i) => i),
      ...Array.from(
        { length: 24 - OPERATING_END },
        (_, i) => i + OPERATING_END,
      ),
    ];

    const isFullyBlocked =
      dateAvail !== null &&
      !dateAvail.available &&
      !dateAvail.booked_slots?.length;

    const disabledHours = () => {
      if (isFullyBlocked) return Array.from({ length: 24 }, (_, i) => i);

      const bookedHours = new Set<number>();
      bookedSlots.forEach((slot) => {
        const slotStart = parseInt(slot.start_time.split(":")[0]);
        const slotEnd = parseInt(slot.end_time.split(":")[0]);

        for (let h = slotStart; h < slotEnd; h++) bookedHours.add(h);

        // 1-hour buffer after booking
        const bufferEnd = slotEnd + BUFFER_HOURS;
        for (let h = slotEnd; h < bufferEnd && h < OPERATING_END; h++)
          bookedHours.add(h);

        // 1-hour buffer before booking
        // const bufferStart = slotStart - BUFFER_HOURS;
        // for (let h = Math.max(bufferStart, OPERATING_START); h < slotStart; h++)
        //   bookedHours.add(h);
      });

      return [...outsideHours, ...Array.from(bookedHours)];
    };

    return { disabledHours };
  }

  // ── Reset form ───────────────────────────────────────────────────────────

  function handleResetForm() {
    setSubmitted(false);
    onSubmittedChange?.(false);
    setBookingCode(null);
    setDateRange(null);
    setTimeRange(null);
    setDateAvail(null);
    setTimeAvail(null);
    setBookedSlots([]);
    setFullDay(false);
    setApplicantType("personal");
    setMobileStart(null);
    setMobileEnd(null);
    setSubmitError(null);
    setSelectedRoomId(rooms[0]?.id ?? null);
    setPreselectedRoom(null);
    form.resetFields();
    form.setFieldValue("room_id", rooms[0]?.id ?? undefined);
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <>
      {submitted ? (
        <Result
          status="success"
          title="Permohonan Berhasil Dikirim!"
          subTitle={
            <Space direction="vertical" size={8} align="center">
              {bookingCode && (
                <div className="booking-code-box">
                  <Text className="booking-code-label">Kode Booking Anda:</Text>
                  <Text className="booking-code-value">{bookingCode}</Text>
                  <Text className="booking-code-hint">
                    Simpan kode ini untuk keperluan konfirmasi
                  </Text>
                </div>
              )}
              {preselectedRoom && (
                <Text style={{ color: "#6b7280", fontSize: 13 }}>
                  Ruangan: <strong>{preselectedRoom.name}</strong>
                </Text>
              )}
              <Text style={{ color: "#6b7280", fontSize: 14 }}>
                Tim kami akan menghubungi Anda dalam 1×24 jam
              </Text>
            </Space>
          }
          extra={
            <Button
              type="primary"
              size="large"
              onClick={handleResetForm}
              className="bfs-btn-primary"
              style={{ marginTop: 8 }}
            >
              Ajukan Permohonan Lain
            </Button>
          }
        />
      ) : (
        <>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="bfs-container"
            requiredMark="optional"
          >
            {/* ── Section 1: Data Pemohon ── */}
            <Card className="bfs-card" styles={{ body: { padding: "24px" } }}>
              <Title level={5} className="bfs-title">
                Data Pemohon
              </Title>
              <Text type="secondary" className="bfs-desc">
                Silakan lengkapi informasi data diri Anda.
              </Text>

              <Form.Item
                name="applicant_type"
                label="Tipe Pemohon"
                initialValue="personal"
              >
                <Radio.Group
                  onChange={(e) => {
                    const newType = e.target.value as ApplicantType;
                    setApplicantType(newType);
                    if (newType === "personal") {
                      form.setFieldValue("acknowledged_by", undefined);
                    }
                  }}
                  style={{ marginBottom: 8 }}
                >
                  <Radio value="personal">Pribadi</Radio>
                  <Radio value="company">Perusahaan / Instansi</Radio>
                </Radio.Group>
              </Form.Item>

              <Divider style={{ margin: "16px 0 24px" }} />

              {applicantType === "personal" ? (
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="nama"
                      label="Nama Lengkap"
                      rules={[{ required: true, message: "Nama wajib diisi" }]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: COLORS.gold }} />}
                        placeholder="Masukkan nama lengkap"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ) : (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="pic_name"
                      label="Nama PIC"
                      rules={[
                        { required: true, message: "Nama PIC wajib diisi" },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: COLORS.gold }} />}
                        placeholder="Nama penanggung jawab"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="company_name"
                      label="Nama Perusahaan / Instansi"
                      rules={[
                        {
                          required: true,
                          message: "Nama perusahaan wajib diisi",
                        },
                      ]}
                    >
                      <Input
                        prefix={<TeamOutlined style={{ color: COLORS.gold }} />}
                        placeholder="Nama perusahaan"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="jabatan" label="Jabatan (Opsional)">
                      <Input
                        prefix={
                          <SolutionOutlined style={{ color: COLORS.gold }} />
                        }
                        placeholder="Jabatan di perusahaan"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="acknowledged_by"
                      label="Diketahui Oleh"
                      tooltip="Nama PIC internal MD yang mengetahui penggunaan studio ini"
                      rules={[
                        {
                          required: needsAcknowledged,
                          message:
                            "Diketahui Oleh wajib diisi untuk perusahaan MD",
                        },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: COLORS.gold }} />}
                        placeholder="Nama PIC internal MD"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="whatsapp"
                    label="Nomor WhatsApp"
                    rules={[{ validator: validateWhatsapp }]}
                    required
                  >
                    <Input
                      prefix="+62"
                      addonBefore={
                        <PhoneOutlined style={{ color: COLORS.gold }} />
                      }
                      placeholder="8123456789"
                      size="large"
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+/, "");
                        form.setFieldsValue({ whatsapp: val });
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[{ type: "email", message: "Email tidak valid" }]}
                  >
                    <Input
                      type="email"
                      prefix={<MailOutlined style={{ color: COLORS.gold }} />}
                      placeholder="email@contoh.com"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* ── Section 2: Tanggal & Waktu ── */}
            <Card className="bfs-card" styles={{ body: { padding: "24px" } }}>
              <Title level={5} className="bfs-title">
                Tanggal &amp; Waktu
              </Title>
              <Text type="secondary" className="bfs-desc">
                Atur jadwal penggunaan ruangan Anda.
              </Text>

              {/* Hidden room field — always present for form submission */}
              <Form.Item name="room_id" hidden>
                <input type="hidden" />
              </Form.Item>

              {/* Optional banner — controlled by SHOW_PRESELECTED_ROOM_BANNER flag */}
              {SHOW_PRESELECTED_ROOM_BANNER && preselectedRoom && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(201,162,39,0.08)",
                    border: "1px solid rgba(201,162,39,0.3)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: COLORS.gold,
                      flexShrink: 0,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: "#92400e" }}>
                    Anda akan booking: <strong>{preselectedRoom.name}</strong>
                  </Text>
                </div>
              )}

              <Row gutter={24} align="top">
                <Col xs={24}>
                  {/* Full Day toggle */}
                  <Form.Item
                    label="Durasi Peminjaman"
                    style={{ marginBottom: 24 }}
                  >
                    <Space className="duration-toggle-box">
                      <Space>
                        <ClockCircleOutlined style={{ color: COLORS.gold }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {fullDay
                            ? "Peminjaman Seharian (00:00 – 23:59)"
                            : "Pilih Jam Spesifik"}
                        </Text>
                      </Space>
                      <Switch
                        checked={fullDay}
                        onChange={handleFullDayToggle}
                        disabled={dateAvail?.full_day_blocked === true}
                        style={
                          fullDay ? { background: COLORS.gold } : undefined
                        }
                      />
                    </Space>
                    {dateAvail?.full_day_blocked && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <WarningOutlined style={{ fontSize: 12 }} />
                        Peminjaman seharian tidak tersedia, sudah ada booking di
                        tanggal ini
                      </div>
                    )}
                  </Form.Item>
                </Col>

                <Col xs={24} md={showTimePicker ? 12 : 24}>
                  {/* Date range — two pickers on mobile, RangePicker on desktop */}
                  {isMobile ? (
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="start_date_mobile"
                          label="Tanggal Mulai"
                          rules={[
                            {
                              required: true,
                              message: "Tanggal mulai wajib dipilih",
                            },
                          ]}
                        >
                          <DatePicker
                            style={{ width: "100%" }}
                            format="DD MMM YYYY"
                            size="large"
                            disabledDate={disabledDate}
                            disabled={availLoading}
                            defaultPickerValue={dayjs()}
                            placeholder="Pilih tanggal mulai"
                            prefix={
                              <CalendarOutlined
                                style={{ color: COLORS.gold }}
                              />
                            }
                            onChange={handleMobileStartChange}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="end_date_mobile"
                          label="Tanggal Selesai"
                          rules={[
                            {
                              required: true,
                              message: "Tanggal selesai wajib dipilih",
                            },
                          ]}
                        >
                          <DatePicker
                            style={{ width: "100%" }}
                            format="DD MMM YYYY"
                            size="large"
                            disabledDate={(d) =>
                              disabledDate(d) ||
                              (mobileStart
                                ? d.isBefore(mobileStart, "day")
                                : false)
                            }
                            disabled={availLoading}
                            defaultPickerValue={mobileStart ?? dayjs()}
                            placeholder="Pilih tanggal selesai"
                            prefix={
                              <CalendarOutlined
                                style={{ color: COLORS.gold }}
                              />
                            }
                            onChange={handleMobileEndChange}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : (
                    <Form.Item
                      name="date_range"
                      label="Rentang Tanggal"
                      rules={[
                        { required: true, message: "Tanggal wajib dipilih" },
                      ]}
                    >
                      <DatePicker.RangePicker
                        style={{ width: "100%" }}
                        disabledDate={disabledDate}
                        disabled={availLoading}
                        format="DD MMM YYYY"
                        prefix={
                          <CalendarOutlined style={{ color: COLORS.gold }} />
                        }
                        placeholder={["Mulai", "Selesai"]}
                        size="large"
                        defaultPickerValue={[dayjs(), dayjs()]}
                        onChange={(values) =>
                          handleDateChange(
                            values as [Dayjs | null, Dayjs | null] | null,
                          )
                        }
                      />
                    </Form.Item>
                  )}
                </Col>

                {/* Time range — only for same-day, non-full-day */}
                {showTimePicker && (
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="time_range"
                      label="Rentang Waktu"
                      rules={[
                        {
                          validator(
                            _: unknown,
                            value: [Dayjs, Dayjs] | undefined,
                          ) {
                            if (!value || !value[0] || !value[1])
                              return Promise.reject(
                                "Jam peminjaman wajib dipilih",
                              );
                            if (value[1].diff(value[0], "minute") < 180)
                              return Promise.reject(
                                "Durasi peminjaman minimal 3 jam",
                              );
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <TimePicker.RangePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        minuteStep={30}
                        disabledTime={disabledTime}
                        disabled={availLoading}
                        prefix={
                          <ClockCircleOutlined style={{ color: COLORS.gold }} />
                        }
                        placeholder={["Mulai", "Selesai"]}
                        size="large"
                        onChange={(values) =>
                          handleTimeChange(
                            values as [Dayjs | null, Dayjs | null] | null,
                          )
                        }
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              {/* Date availability feedback */}
              {(availLoading || dateAvail || timeAvail) && (
                <div style={{ marginTop: 16 }}>
                  {availLoading && (
                    <Alert
                      type="info"
                      message="Memeriksa ketersediaan ruangan…"
                      showIcon
                      className="alert-item"
                    />
                  )}
                  {!availLoading && dateAvail && !dateAvail.available && (
                    <Alert
                      type="error"
                      message={
                        dateAvail.message ?? "Tanggal ini tidak tersedia"
                      }
                      showIcon
                      className="alert-item"
                    />
                  )}
                  {!availLoading &&
                    dateAvail?.available &&
                    (dateAvail.booked_slots?.length ?? 0) > 0 && (
                      <Alert
                        type="warning"
                        message={
                          dateAvail.message ??
                          "Ada peminjaman pada tanggal ini, jadwal yang terisi ditandai abu-abu"
                        }
                        showIcon
                        className="alert-item"
                      />
                    )}
                  {!availLoading &&
                    dateAvail?.available &&
                    !dateAvail.booked_slots?.length &&
                    !showTimePicker && (
                      <Alert
                        type="success"
                        message="Tanggal tersedia"
                        showIcon
                        className="alert-item"
                      />
                    )}

                  {showTimePicker && !availLoading && timeAvail && (
                    <>
                      {!timeAvail.available ? (
                        <Alert
                          type="error"
                          message={
                            timeAvail.message ?? "Slot waktu ini tidak tersedia"
                          }
                          showIcon
                          className="alert-item"
                          style={{ marginTop: "10px" }}
                        />
                      ) : (
                        <Alert
                          type="success"
                          message="Slot waktu tersedia"
                          showIcon
                          className="alert-item"
                          style={{ marginTop: "10px" }}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Info for multi-day */}
              {dateRange && !showTimePicker && !availLoading && (
                <Alert
                  type="info"
                  message={
                    fullDay
                      ? "Peminjaman Seharian: Waktu akan ditetapkan 00:00 – 23:59"
                      : "Peminjaman Lebih dari 1 Hari: Waktu akan ditetapkan 00:00 – 23:59"
                  }
                  showIcon
                  className="alert-item"
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* ── Submit error ── */}
            {submitError && (
              <Alert
                type="error"
                message={submitError}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* ── SOP checkbox ── */}
            <Form.Item
              name="agree_sop"
              valuePropName="checked"
              rules={[
                {
                  validator: (_: unknown, value: boolean) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject("Anda harus membaca dan menyetujui SOP"),
                },
              ]}
              style={{ marginBottom: 12 }}
            >
              <Checkbox>
                <Text style={{ fontSize: 13 }}>
                  Saya telah membaca dan memahami{" "}
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSopOpen(true);
                    }}
                    className="sop-link"
                    style={{ textDecoration: "underline" }}
                  >
                    Standard Operating Procedure (SOP)
                  </a>
                </Text>
              </Checkbox>
            </Form.Item>

            {/* ── ToS checkbox ── */}
            <Form.Item
              name="agree_tos"
              valuePropName="checked"
              rules={[
                {
                  validator: (_: unknown, value: boolean) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(
                          "Anda harus menyetujui Syarat dan Ketentuan",
                        ),
                },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Checkbox>
                <Text style={{ fontSize: 13 }}>
                  Saya telah membaca dan menyetujui{" "}
                  <a
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTosOpen(true);
                    }}
                    className="tos-link"
                    style={{ textDecoration: "underline" }}
                  >
                    Syarat dan Ketentuan
                  </a>{" "}
                  peminjaman ruangan
                </Text>
              </Checkbox>
            </Form.Item>

            {/* ── Submit button ── */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
                size="large"
                className="bfs-btn-primary"
              >
                Kirim Permohonan
              </Button>
            </Form.Item>

            <TermsModal
              open={tosOpen}
              onClose={() => setTosOpen(false)}
              onAgree={() => {
                form.setFieldValue("agree_tos", true);
                form.validateFields(["agree_tos"]).catch(() => undefined);
              }}
            />

            <SOPModal
              open={sopOpen}
              onClose={() => setSopOpen(false)}
              onAgree={() => {
                form.setFieldValue("agree_sop", true);
                form.validateFields(["agree_sop"]).catch(() => undefined);
              }}
            />
          </Form>
        </>
      )}
    </>
  );
}
