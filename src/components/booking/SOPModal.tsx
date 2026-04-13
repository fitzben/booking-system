import { Modal, Typography, Divider, Space, Button } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  SwapOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
  DollarOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;

interface SOPModalProps {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
}

const SOP_SECTIONS = [
  {
    icon: <FileTextOutlined />,
    color: "#2563eb",
    title: "1. Tujuan",
    content:
      "Menjamin penggunaan studio dan fasilitas berlangsung secara tertib, terkontrol, serta melindungi aset perusahaan dari risiko kerusakan dan kehilangan.",
  },
  {
    icon: <FileTextOutlined />,
    color: "#2563eb",
    title: "2. Ruang Lingkup",
    content:
      "SOP ini berlaku untuk seluruh penggunaan studio oleh Internal Production, External Production, dan Vendor / pihak ketiga.",
    subTitle: "Pihak Eksternal wajib melampirkan:",
    subItems: [
      "Perusahaan: NPWP Perusahaan, Akta / Identitas Perusahaan, KTP PIC",
      "Perorangan: KTP, NPWP (Jika ada)",
    ],
  },
  {
    icon: <CheckCircleOutlined />,
    color: "#059669",
    title: "3. Ketentuan Umum",
    points: [
      "Setiap penggunaan studio wajib mendapatkan persetujuan.",
      "Setiap kegiatan wajib memiliki Person In Charge (PIC) di lokasi.",
      "Seluruh penggunaan fasilitas dan equipment harus terdokumentasi.",
      "Pengguna bertanggung jawab penuh atas kondisi studio selama penggunaan.",
      "Kerusakan atau kehilangan barang pribadi bukan tanggung jawab pengelola.",
    ],
  },
  {
    icon: <FileTextOutlined />,
    color: "#7c3aed",
    title: "4.1 Permohonan Penggunaan Studio",
    points: [
      "Setiap penggunaan wajib diajukan melalui Formulir Penggunaan (FORM A).",
      "Permohonan harus mendapat persetujuan dari Pengelola Studio / Gedung.",
      "Penggunaan tanpa persetujuan merupakan pelanggaran ketentuan.",
      "Internal: wajib persetujuan atasan langsung.",
      "Eksternal: sah setelah dokumen lengkap diterima dan pembayaran dilakukan.",
    ],
  },
  {
    icon: <TeamOutlined />,
    color: "#0891b2",
    title: "4.2 Penunjukan PIC",
    points: [
      "Wajib menunjuk 1 (satu) PIC yang bertanggung jawab penuh.",
      "PIC bertanggung jawab atas seluruh aktivitas di lokasi.",
      "PIC bertanggung jawab atas penggunaan fasilitas dan equipment.",
      "PIC bertanggung jawab atas kondisi studio selama dan setelah penggunaan.",
      "PIC bertanggung jawab atas setiap kerusakan dan/atau kehilangan.",
    ],
  },
  {
    icon: <SwapOutlined />,
    color: "#d97706",
    title: "4.3 Serah Terima Studio",
    points: [
      "Serah terima wajib menggunakan Form Serah Terima (Form B).",
      "Dilakukan sebelum dan setelah penggunaan.",
      "Tanpa serah terima, kegiatan tidak diperkenankan dimulai.",
    ],
  },
  {
    icon: <ToolOutlined />,
    color: "#0891b2",
    title: "4.4 Penggunaan Equipment",
    points: [
      "Seluruh penggunaan equipment wajib dicatat dalam Log Equipment (Form C).",
      "Dilarang mengambil equipment tanpa izin.",
      "Dilarang memindahkan tanpa pencatatan.",
    ],
  },
  {
    icon: <CheckCircleOutlined />,
    color: "#059669",
    title: "4.5 Kondisi Studio",
    points: [
      "Wajib melakukan checklist kondisi studio setelah penggunaan.",
      "Wajib membersihkan area penggunaan.",
      "Wajib mengembalikan layout dan equipment ke kondisi semula.",
      "Seluruh barang wajib dikeluarkan pada hari yang sama setelah selesai.",
    ],
  },
  {
    icon: <WarningOutlined />,
    color: "#dc2626",
    title: "4.6 Kerusakan & Kehilangan",
    points: [
      "Kerusakan dan/atau kehilangan menjadi tanggung jawab pengguna.",
      "Wajib dilaporkan dalam Form Kerusakan/Kehilangan (Form D).",
      "Penggantian sesuai nilai kerugian yang ditetapkan perusahaan.",
      "Harga penggantian mencakup: harga barang, biaya pengiriman, biaya instalasi.",
    ],
  },
  {
    icon: <DollarOutlined />,
    color: "#d97706",
    title: "4.7 Tarif & Pembayaran",
    points: [
      "Tarif dibedakan: Internal Production, External Production, Vendor.",
      "Per jam (minimum 4 jam), Per hari (10 jam).",
      "Overtime per jam berlaku sampai 12 jam (2 jam tambahan).",
      "Lebih dari 12 jam dihitung 1 hari tambahan.",
      "Internal: sesuai mekanisme internal.",
      "External: wajib pembayaran sebelum penggunaan.",
      "Harga belum termasuk pajak.",
    ],
  },
  {
    icon: <StopOutlined />,
    color: "#dc2626",
    title: "5. Larangan",
    points: [
      "Menggunakan studio tanpa persetujuan.",
      "Tidak mengisi/melengkapi formulir yang diwajibkan.",
      "Membawa keluar equipment tanpa izin.",
      "Meninggalkan studio dalam kondisi tidak layak.",
      "Merokok dan/atau menggunakan vape di area studio.",
      "Membawa senjata tajam, narkotika, atau barang berbahaya.",
    ],
  },
  {
    icon: <UserOutlined />,
    color: "#7c3aed",
    title: "6. Penanggung Jawab (Studio Keeper)",
    points: [
      "Mengontrol penggunaan studio.",
      "Memverifikasi seluruh dokumen penggunaan.",
      "Pengecekan kondisi studio sebelum dan sesudah penggunaan.",
      "Pengecekan equipment sebelum dan sesudah penggunaan.",
    ],
  },
  {
    icon: <SafetyOutlined />,
    color: "#dc2626",
    title: "7. Sanksi",
    points: [
      "Penundaan dan/atau penghentian penggunaan fasilitas studio.",
      "Kewajiban pembayaran atas kerusakan/kehilangan dalam 1×24 jam.",
      "Pelanggaran hukum diproses sesuai peraturan perundang-undangan.",
    ],
  },
];

export default function SOPModal({ open, onClose, onAgree }: SOPModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#1e3a5f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileTextOutlined style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Standard Operating Procedure (SOP)
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>
              Penggunaan Studio &amp; Fasilitas — PT. MD Entertainment, Tbk
            </div>
          </div>
        </Space>
      }
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Tutup</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              onAgree();
              onClose();
            }}
            style={{
              background: "#1e3a5f",
              borderColor: "#1e3a5f",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Saya Memahami &amp; Setuju
          </Button>
        </div>
      }
      width="min(720px, calc(100vw - 32px))"
      styles={{
        body: { maxHeight: "65vh", overflowY: "auto", padding: "16px 24px" },
      }}
    >
      {/* Header info */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 13, color: "#1e40af" }}>
          Dokumen ini merupakan SOP resmi PT. MD Entertainment, Tbk. Dengan
          menyetujui, Anda menyatakan telah membaca, memahami, dan bersedia
          mematuhi seluruh ketentuan yang berlaku.
        </Text>
      </div>

      {/* Sections */}
      <Space direction="vertical" size={0} style={{ width: "100%" }}>
        {SOP_SECTIONS.map((section, i) => (
          <div key={i}>
            {i > 0 && <Divider style={{ margin: "14px 0" }} />}
            <Space align="start" style={{ width: "100%" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  flexShrink: 0,
                  marginTop: 1,
                  background: `${section.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: section.color,
                  fontSize: 14,
                }}
              >
                {section.icon}
              </div>
              <div style={{ flex: 1 }}>
                <Text
                  strong
                  style={{ fontSize: 13, display: "block", marginBottom: 6 }}
                >
                  {section.title}
                </Text>
                {section.content && (
                  <Paragraph
                    style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}
                  >
                    {section.content}
                  </Paragraph>
                )}
                {section.subTitle && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {section.subTitle}
                  </Text>
                )}
                {section.subItems && (
                  <ul style={{ margin: "0 0 6px", paddingLeft: 16 }}>
                    {section.subItems.map((item, j) => (
                      <li key={j}>
                        <Text style={{ fontSize: 13, color: "#374151" }}>
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
                {section.points && (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {section.points.map((point, j) => (
                      <li key={j}>
                        <Text style={{ fontSize: 13, color: "#374151" }}>
                          {point}
                        </Text>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Space>
          </div>
        ))}
      </Space>

      {/* Footer note */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "10px 14px",
          marginTop: 20,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>
          SOP ini berlaku efektif dan wajib dipatuhi oleh seluruh pengguna
          studio. PT. MD Entertainment, Tbk berhak melakukan perubahan
          sewaktu-waktu.
        </Text>
      </div>
    </Modal>
  );
}
