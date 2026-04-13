import { useState, useEffect } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Checkbox,
  DatePicker,
  TimePicker,
  Button,
  Steps,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Alert,
  Result,
  Tag,
  Skeleton,
  Divider,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  SolutionOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import {
  KEPERLUAN_OPTIONS,
  JENIS_PRODUKSI_OPTIONS,
  FASILITAS_OPTIONS,
} from "../../lib/constants";
import { createBooking, getRooms, getRoomPricing } from "../../lib/api";
import type { Room, RoomPricingTier } from "../../lib/api";
import { calculatePrice } from "../../lib/pricing";
import { fmtPrice } from "../../lib/utils";
import PublicLayout from "../layout/PublicLayout";
import { COLORS } from "../../lib/theme";

const { Title, Text } = Typography;

type ApplicantType = "personal" | "company";

// ── Validators ────────────────────────────────────────────────────────────────

function processWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

function validateWhatsapp(_: unknown, value: string) {
  if (!value) return Promise.reject("Nomor WhatsApp wajib diisi");
  if (processWhatsapp(value).length < 10) {
    return Promise.reject(
      "Nomor WhatsApp minimal 10 digit setelah kode negara (+62)",
    );
  }
  return Promise.resolve();
}

function validateTimeRange(
  _: unknown,
  value: [Dayjs, Dayjs] | null | undefined,
) {
  if (!value || !value[0] || !value[1])
    return Promise.reject("Waktu peminjaman wajib diisi");
  if (value[1].diff(value[0], "minute") < 180)
    return Promise.reject("Durasi peminjaman minimal 3 jam");
  return Promise.resolve();
}

// ── Step config ───────────────────────────────────────────────────────────────

const STEP_ITEMS = [
  { title: "Pemohon" },
  { title: "Kegiatan" },
  { title: "Peminjaman" },
];

function getStepFields(
  step: number,
  applicantType: ApplicantType,
  keperluan: string,
  jenisProduksi: string,
  selectedRooms: string[],
): string[] {
  if (step === 0) {
    const base = ["applicant_type", "whatsapp"];
    return applicantType === "personal"
      ? [...base, "nama"]
      : [...base, "pic_name", "company_name", "job_position"];
  }
  if (step === 1) {
    const base = ["keperluan", "jenis_produksi", "penjelasan_kegiatan"];
    if (keperluan === "Lainnya") base.push("keperluan_lainnya");
    if (jenisProduksi === "Lainnya") base.push("jenis_produksi_lainnya");
    return base;
  }
  const base = [
    "ruangan",
    "jumlah_crew",
    "jumlah_talent",
    "date_range",
    "time_range",
    "fasilitas",
  ];
  if (selectedRooms.includes("Lainnya")) base.push("ruangan_lainnya");
  return base;
}

// ── Price Summary ─────────────────────────────────────────────────────────────

interface PriceSummaryProps {
  selectedRoomNames: string[];
  rooms: Room[];
  pricings: Record<number, RoomPricingTier[]>;
  timeRange: [Dayjs, Dayjs] | null | undefined;
}

function PriceSummary({
  selectedRoomNames,
  rooms,
  pricings,
  timeRange,
}: PriceSummaryProps) {
  if (!selectedRoomNames.length) return null;

  const durationMinutes =
    timeRange?.[0] && timeRange?.[1]
      ? timeRange[1].diff(timeRange[0], "minute")
      : null;

  // Map room names → Room objects
  const roomsByName = Object.fromEntries(rooms.map((r) => [r.name, r]));

  const rows = selectedRoomNames
    .filter((name) => name !== "Lainnya")
    .map((name) => {
      const room = roomsByName[name];
      if (!room) return { name, price: null, note: "Sesuai kesepakatan" };

      const tiers = pricings[room.id] ?? [];
      if (!tiers.length)
        return { name, price: null, note: "Harga belum diatur" };
      if (!durationMinutes)
        return { name, price: null, note: "Pilih waktu untuk estimasi" };

      const price = calculatePrice(tiers, room.overtime_rate, durationMinutes);
      const matchedTier = [...tiers]
        .sort((a, b) => b.hours - a.hours)
        .find((t) => t.hours <= durationMinutes / 60);

      const hrs = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const durationLabel = mins > 0 ? `${hrs}j ${mins}m` : `${hrs} jam`;
      const tierLabel = matchedTier
        ? `Tier ${matchedTier.hours}j`
        : "Overtime only";

      return { name, price, note: null, durationLabel, tierLabel };
    });

  const hasLainnya = selectedRoomNames.includes("Lainnya");
  const total = rows.reduce((sum, r) => sum + (r.price ?? 0), 0);
  const allPriced = rows.every((r) => r.price !== null) && !hasLainnya;

  return (
    <Card
      size="small"
      style={{
        borderRadius: 10,
        background: "#fafbfc",
        border: "1px solid #e5e7eb",
        marginTop: 4,
      }}
    >
      <Space align="center" style={{ marginBottom: 10 }}>
        <DollarOutlined style={{ color: COLORS.gold }} />
        <Text style={{ fontWeight: 600, fontSize: 13 }}>Estimasi Biaya</Text>
        {durationMinutes && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({Math.floor(durationMinutes / 60)}j
            {durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ""}{" "}
            durasi)
          </Text>
        )}
      </Space>

      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        {rows.map((row) => (
          <Row
            key={row.name}
            justify="space-between"
            align="middle"
            wrap={false}
          >
            <Col flex="auto">
              <Text style={{ fontSize: 13 }}>{row.name}</Text>
              {row.tierLabel && (
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                  ({row.tierLabel})
                </Text>
              )}
            </Col>
            <Col flex="none">
              {row.price !== null ? (
                <Text style={{ fontWeight: 600, fontSize: 13 }}>
                  {fmtPrice(row.price)}
                </Text>
              ) : (
                <Text
                  type="secondary"
                  style={{ fontSize: 12, fontStyle: "italic" }}
                >
                  {row.note}
                </Text>
              )}
            </Col>
          </Row>
        ))}

        {hasLainnya && (
          <Row justify="space-between" align="middle">
            <Col>
              <Text style={{ fontSize: 13 }}>Ruangan Lainnya</Text>
            </Col>
            <Col>
              <Text
                type="secondary"
                style={{ fontSize: 12, fontStyle: "italic" }}
              >
                Sesuai kesepakatan
              </Text>
            </Col>
          </Row>
        )}

        {(rows.length > 1 || hasLainnya) && (
          <>
            <Divider style={{ margin: "6px 0" }} />
            <Row justify="space-between" align="middle">
              <Col>
                <Text style={{ fontWeight: 600, fontSize: 13 }}>
                  Total Estimasi
                </Text>
              </Col>
              <Col>
                {allPriced ? (
                  <Text
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: COLORS.gold,
                    }}
                  >
                    {fmtPrice(total)}
                  </Text>
                ) : (
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, fontStyle: "italic" }}
                  >
                    Sebagian sesuai kesepakatan
                  </Text>
                )}
              </Col>
            </Row>
          </>
        )}
      </Space>

      <Text
        type="secondary"
        style={{ fontSize: 11, display: "block", marginTop: 10 }}
      >
        * Estimasi belum termasuk pajak. Harga final dikonfirmasi oleh admin.
      </Text>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

function Wrap({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  return embedded ? <>{children}</> : <PublicLayout>{children}</PublicLayout>;
}

export default function BookingForm({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [applicantType, setApplicantType] = useState<ApplicantType>("personal");
  const [keperluan, setKeperluan] = useState("");
  const [jenisProduksi, setJenisProduksi] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");

  // ── Room data from API ────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pricings, setPricings] = useState<Record<number, RoomPricingTier[]>>(
    {},
  );
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fetchedRooms = await getRooms();
        setRooms(fetchedRooms);
        // Fetch all pricings in parallel
        const entries = await Promise.all(
          fetchedRooms.map(async (r) => {
            const tiers = await getRoomPricing(r.id);
            return [r.id, tiers] as [number, RoomPricingTier[]];
          }),
        );
        setPricings(Object.fromEntries(entries));
      } catch {
        // Non-fatal — form still works, pricing just won't show
      } finally {
        setRoomsLoading(false);
      }
    })();
  }, []);

  // Watch time_range for live price calculation
  // Watch fields for live calculation
  const timeRange = Form.useWatch("time_range", form) as
    | [Dayjs, Dayjs]
    | undefined;
  const crewCount = Form.useWatch("jumlah_crew", form) as number | undefined;
  const talentCount = Form.useWatch("jumlah_talent", form) as
    | number
    | undefined;
  const totalPeople = (crewCount ?? 0) + (talentCount ?? 0);

  const exceededRooms = rooms
    .filter((r) => selectedRooms.includes(r.name))
    .filter((r) => {
      if (!r.capacity) return false;
      const match = r.capacity.match(/(\d+)/);
      if (!match) return false;
      const cap = parseInt(match[1], 10);
      return totalPeople > cap;
    });

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = async () => {
    try {
      await form.validateFields(
        getStepFields(
          step,
          applicantType,
          keperluan,
          jenisProduksi,
          selectedRooms,
        ),
      );
      setStep((s) => s + 1);
    } catch {
      // antd shows field-level errors automatically
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields(
        getStepFields(
          2,
          applicantType,
          keperluan,
          jenisProduksi,
          selectedRooms,
        ),
      );
    } catch {
      return;
    }

    const v = form.getFieldsValue(true);
    const dateRange = v.date_range as [Dayjs, Dayjs] | null | undefined;
    const timeRangeVal = v.time_range as [Dayjs, Dayjs] | null | undefined;

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      setSubmitError("Tanggal peminjaman wajib diisi");
      return;
    }
    if (!timeRangeVal || !timeRangeVal[0] || !timeRangeVal[1]) {
      setSubmitError("Waktu peminjaman wajib diisi");
      return;
    }

    const payload: Record<string, unknown> = {
      applicant_type: applicantType,
      whatsapp: processWhatsapp(v.whatsapp ?? ""),
      email: v.email || undefined,
      keperluan: v.keperluan,
      keperluan_lainnya:
        v.keperluan === "Lainnya" ? v.keperluan_lainnya : undefined,
      jenis_produksi: v.jenis_produksi,
      jenis_produksi_lainnya:
        v.jenis_produksi === "Lainnya" ? v.jenis_produksi_lainnya : undefined,
      jumlah_crew: v.jumlah_crew,
      jumlah_talent: v.jumlah_talent,
      ruangan: v.ruangan,
      ruangan_lainnya: selectedRooms.includes("Lainnya")
        ? v.ruangan_lainnya
        : undefined,
      date_start: dateRange[0].format("YYYY-MM-DD"),
      date_end: dateRange[1].format("YYYY-MM-DD"),
      time_start: timeRangeVal[0].format("HH:mm"),
      time_end: timeRangeVal[1].format("HH:mm"),
      fasilitas: v.fasilitas,
      job_position: applicantType === "company" ? v.job_position : undefined,
      penjelasan_kegiatan: v.penjelasan_kegiatan,
    };

    if (applicantType === "personal") {
      payload.nama = v.nama;
    } else {
      payload.pic_name = v.pic_name;
      payload.company_name = v.company_name;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const booking = await createBooking(payload);
      setSuccessId(booking.id);
    } catch (err: unknown) {
      setSubmitError(
        (err as Error).message ?? "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setStep(0);
    setApplicantType("personal");
    setKeperluan("");
    setJenisProduksi("");
    setSelectedRooms([]);
    setSuccessId(null);
    setSubmitError("");
  };

  // ── Success state ─────────────────────────────────────────────────────────

  if (successId !== null) {
    return (
      <Wrap embedded={embedded}>
        <Card
          style={{ borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <Result
            icon={
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <img
                  src="/MDE_logo.png"
                  alt="MD Entertainment Logo"
                  style={{ height: 64, width: "auto" }}
                />
              </div>
            }
            status="success"
            title="Permohonan berhasil dikirim!"
            subTitle={
              <Space
                direction="vertical"
                size={4}
                style={{ textAlign: "center" }}
              >
                <Text>Nomor booking Anda:</Text>
                <Tag
                  color="gold"
                  style={{ fontSize: 20, padding: "6px 20px", lineHeight: 1.6 }}
                >
                  #{successId}
                </Tag>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Tim kami akan menghubungi Anda untuk konfirmasi lebih lanjut.
                </Text>
              </Space>
            }
            extra={
              <Button type="primary" size="large" onClick={handleReset}>
                Ajukan Permohonan Baru
              </Button>
            }
          />
        </Card>
      </Wrap>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <Wrap embedded={embedded}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {/* Steps indicator */}
        <Card
          style={{ borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        >
          <Steps
            current={step}
            items={STEP_ITEMS}
            size="small"
          />
        </Card>

        {/* Form card */}
        <Card
          style={{ borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ applicant_type: "personal" }}
            scrollToFirstError
          >
            {/* ── Step 0: Data Pemohon ──────────────────────────────────── */}
            {step === 0 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Title
                    level={5}
                    style={{ marginBottom: 2, color: COLORS.navy }}
                  >
                    Data Pemohon
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Lengkapi informasi pemohon yang akan menggunakan ruangan.
                  </Text>
                </div>

                <Form.Item
                  name="applicant_type"
                  label="Tipe Pemohon"
                  rules={[
                    { required: true, message: "Tipe pemohon wajib dipilih" },
                  ]}
                >
                  <Radio.Group
                    onChange={(e) => {
                      setApplicantType(e.target.value as ApplicantType);
                      form.resetFields(["nama", "pic_name", "company_name"]);
                    }}
                  >
                    <Radio value="personal">Pribadi</Radio>
                    <Radio value="company">Perusahaan / Instansi</Radio>
                  </Radio.Group>
                </Form.Item>

                {applicantType === "personal" ? (
                  <Form.Item
                    name="nama"
                    label="Nama Lengkap"
                    rules={[{ required: true, message: "Nama wajib diisi" }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Nama lengkap pemohon"
                      size="large"
                    />
                  </Form.Item>
                ) : (
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        name="pic_name"
                        label="Nama PIC"
                        rules={[
                          { required: true, message: "Nama PIC wajib diisi" },
                        ]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Person in charge"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
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
                          prefix={<TeamOutlined />}
                          placeholder="PT / CV / nama instansi"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="job_position" label="Jabatan (opsional)">
                        <Input
                          prefix={<SolutionOutlined />}
                          placeholder="Jabatan"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="whatsapp"
                      label="Nomor WhatsApp"
                      rules={[{ validator: validateWhatsapp }]}
                    >
                      <Input
                        addonBefore={
                          <Space size={4}>
                            <PhoneOutlined />
                          </Space>
                        }
                        prefix="+62"
                        placeholder="8xxxxxxxxxx"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="email" label="Email (opsional)">
                      <Input
                        prefix={<MailOutlined />}
                        type="email"
                        placeholder="email@contoh.com"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}

            {/* ── Step 1: Data Kegiatan ─────────────────────────────────── */}
            {step === 1 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Title
                    level={5}
                    style={{ marginBottom: 2, color: COLORS.navy }}
                  >
                    Data Kegiatan
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Informasi mengenai kegiatan atau produksi yang akan
                    dilakukan.
                  </Text>
                </div>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="keperluan"
                      label="Keperluan"
                      rules={[
                        { required: true, message: "Keperluan wajib dipilih" },
                      ]}
                    >
                      <Select
                        placeholder="Pilih keperluan"
                        size="large"
                        onChange={(val: string) => {
                          setKeperluan(val);
                          form.resetFields(["keperluan_lainnya"]);
                        }}
                        options={KEPERLUAN_OPTIONS.map((o) => ({
                          value: o,
                          label: o,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="jenis_produksi"
                      label="Jenis Produksi"
                      rules={[
                        {
                          required: true,
                          message: "Jenis produksi wajib dipilih",
                        },
                      ]}
                    >
                      <Select
                        placeholder="Pilih jenis produksi"
                        size="large"
                        onChange={(val: string) => {
                          setJenisProduksi(val);
                          form.resetFields(["jenis_produksi_lainnya"]);
                        }}
                        options={JENIS_PRODUKSI_OPTIONS.map((o) => ({
                          value: o,
                          label: o,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {keperluan === "Lainnya" && (
                  <Form.Item
                    name="keperluan_lainnya"
                    label="Keperluan Lainnya"
                    preserve={false}
                    rules={[
                      {
                        required: true,
                        message: "Harap jelaskan keperluan Anda",
                      },
                    ]}
                  >
                    <Input placeholder="Jelaskan keperluan Anda" size="large" />
                  </Form.Item>
                )}

                {jenisProduksi === "Lainnya" && (
                  <Form.Item
                    name="jenis_produksi_lainnya"
                    label="Jenis Produksi Lainnya"
                    preserve={false}
                    rules={[
                      {
                        required: true,
                        message: "Harap jelaskan jenis produksi Anda",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Jelaskan jenis produksi Anda"
                      size="large"
                    />
                  </Form.Item>
                )}

                <Form.Item
                  name="penjelasan_kegiatan"
                  label="Penjelasan Kegiatan"
                  rules={[
                    {
                      required: true,
                      message:
                        "Harap berikan penjelasan singkat mengenai kegiatan Anda",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder={`${keperluan || "Keperluan"} film Danur 3`}
                    size="large"
                  />
                </Form.Item>
              </>
            )}

            {/* ── Step 2: Detail Peminjaman ─────────────────────────────── */}
            {step === 2 && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Title
                    level={5}
                    style={{ marginBottom: 2, color: COLORS.navy }}
                  >
                    Detail Peminjaman
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Pilih ruangan, tanggal, waktu, dan fasilitas yang
                    diinginkan.
                  </Text>
                </div>

                <Form.Item
                  name="ruangan"
                  label="Ruangan yang Dibutuhkan"
                  rules={[
                    {
                      required: true,
                      type: "array",
                      min: 1,
                      message: "Pilih minimal satu ruangan",
                    },
                  ]}
                >
                  {roomsLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} title={false} />
                  ) : (
                    <Checkbox.Group
                      style={{ width: "100%" }}
                      onChange={(vals) => {
                        setSelectedRooms(vals as string[]);
                        if (!(vals as string[]).includes("Lainnya"))
                          form.resetFields(["ruangan_lainnya"]);
                      }}
                    >
                      <Row gutter={[12, 12]}>
                        {rooms.map((room) => (
                          <Col xs={24} sm={12} key={room.id}>
                            <Checkbox
                              value={room.name}
                              className="responsive-checkbox"
                            >
                              <div style={{ marginLeft: 8 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>
                                  {room.name}
                                </div>
                                <Space size={8}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    {pricings[room.id]?.length
                                      ? `Mulai ${fmtPrice(Math.min(...pricings[room.id].map((t) => t.price)))}`
                                      : room.base_price && room.base_price > 0
                                        ? `${fmtPrice(room.base_price)}/dasar`
                                        : "Sesuai kesepakatan"}
                                  </Text>
                                  {room.capacity && (
                                    <Tag
                                      color="blue"
                                      bordered={false}
                                      style={{
                                        fontSize: 10,
                                        margin: 0,
                                        paddingInline: 6,
                                      }}
                                    >
                                      Cap: {room.capacity}
                                    </Tag>
                                  )}
                                </Space>
                              </div>
                            </Checkbox>
                          </Col>
                        ))}
                        <Col xs={24} sm={12}>
                          <Checkbox
                            value="Lainnya"
                            className="responsive-checkbox"
                          >
                            <span style={{ marginLeft: 8, fontWeight: 600 }}>
                              Lainnya
                            </span>
                          </Checkbox>
                        </Col>
                      </Row>
                    </Checkbox.Group>
                  )}
                </Form.Item>

                {selectedRooms.includes("Lainnya") && (
                  <Form.Item
                    name="ruangan_lainnya"
                    label="Ruangan Lainnya"
                    preserve={false}
                    rules={[
                      {
                        required: true,
                        message: "Nama ruangan lainnya wajib diisi",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Nama ruangan yang diinginkan"
                      size="large"
                    />
                  </Form.Item>
                )}

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="jumlah_crew"
                      label="Jumlah Crew"
                      rules={[
                        { required: true, message: "Jumlah crew wajib diisi" },
                      ]}
                      tooltip="Masukkan jumlah tim produksi yang akan hadir"
                    >
                      <InputNumber
                        min={1}
                        style={{ width: "100%" }}
                        size="large"
                        placeholder="0"
                        addonBefore={<TeamOutlined />}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="jumlah_talent"
                      label="Jumlah Talent"
                      rules={[
                        {
                          required: true,
                          message: "Jumlah talent wajib diisi",
                        },
                      ]}
                      tooltip="Masukkan jumlah talent/model yang akan hadir"
                    >
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        size="large"
                        placeholder="0"
                        addonBefore={<CrownOutlined />}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {exceededRooms.length > 0 && totalPeople > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message={
                      <Space direction="vertical" size={0}>
                        <div style={{ fontWeight: 600 }}>
                          Melebihi Kapasitas Ruangan
                        </div>
                        <div style={{ fontSize: 13 }}>
                          Jumlah orang ({totalPeople}) melebihi kapasitas{" "}
                          {exceededRooms.map((r) => r.name).join(", ")}. Harap
                          pertimbangkan untuk menyewa ruangan tambahan atau
                          mengurangi durasi.
                        </div>
                      </Space>
                    }
                  />
                )}

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="date_range"
                      label="Hari / Tanggal Peminjaman"
                      rules={[
                        {
                          required: true,
                          message: "Tanggal peminjaman wajib diisi",
                        },
                      ]}
                    >
                      <DatePicker.RangePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        size="large"
                        defaultPickerValue={[dayjs(), dayjs()]}
                        disabledDate={(current) =>
                          current != null &&
                          current.isBefore(dayjs().startOf("day"))
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="time_range"
                      label="Waktu Peminjaman"
                      rules={[{ validator: validateTimeRange }]}
                    >
                      <TimePicker.RangePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        minuteStep={30}
                        order={true}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Price summary — shown once at least one room is selected */}
                {selectedRooms.length > 0 && (
                  <PriceSummary
                    selectedRoomNames={selectedRooms}
                    rooms={rooms}
                    pricings={pricings}
                    timeRange={timeRange}
                  />
                )}

                <Form.Item
                  name="fasilitas"
                  label="Fasilitas yang Dibutuhkan"
                  style={{ marginTop: 24 }}
                  rules={[
                    {
                      required: true,
                      type: "array",
                      min: 1,
                      message: "Pilih minimal satu fasilitas",
                    },
                  ]}
                >
                  <Checkbox.Group style={{ width: "100%" }}>
                    <Row gutter={[12, 12]}>
                      {FASILITAS_OPTIONS.map((f) => (
                        <Col key={f.value} xs={24} sm={12} md={8}>
                          <Checkbox
                            value={f.value}
                            className="responsive-checkbox"
                          >
                            <span style={{ marginLeft: 8 }}>{f.label}</span>
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </Form.Item>

                {submitError && (
                  <Alert
                    type="error"
                    message={submitError}
                    showIcon
                    style={{ marginTop: 16, borderRadius: 8 }}
                  />
                )}
              </>
            )}
          </Form>
        </Card>

        {/* Navigation buttons */}
        <div className="nav-buttons">
          <Button
            size="large"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="nav-btn-prev"
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            ← Kembali
          </Button>

          {step < STEP_ITEMS.length - 1 ? (
            <Button
              type="primary"
              size="large"
              onClick={goNext}
              className="nav-btn-next"
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              Lanjut →
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={handleSubmit}
              icon={<CheckCircleOutlined />}
              className="nav-btn-next"
              style={{ borderRadius: 10, fontWeight: 700 }}
            >
              Kirim Permohonan
            </Button>
          )}
        </div>

        <style>{`
          .responsive-checkbox {
            display: flex !important;
            align-items: center;
            background: #fff;
            border: 1px solid #e5e7eb;
            padding: 12px 16px;
            border-radius: 10px;
            width: 100%;
            margin: 0 !important;
            transition: all 0.2s;
          }
          .responsive-checkbox:hover {
            border-color: ${COLORS.gold};
            background: #fffcf5;
          }
          .ant-checkbox-wrapper-checked.responsive-checkbox {
            border-color: ${COLORS.gold};
            background: #fffcf5;
            box-shadow: 0 2px 8px rgba(212,175,55,0.1);
          }
          .nav-buttons {
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }
          @media (max-width: 640px) {
            .nav-buttons {
              flex-direction: column-reverse;
            }
            .nav-btn-prev, .nav-btn-next {
              width: 100% !important;
              height: 52px !important;
            }
          }
        `}</style>
      </Space>
    </Wrap>
  );
}
