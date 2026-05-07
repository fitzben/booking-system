// =============================================================
//  SOP CONTENT — Edit file ini untuk update konten SOP
//  Tersedia icon: "file" | "check" | "team" | "swap" | "tool"
//                 "warning" | "stop" | "dollar" | "safety" | "user"
// =============================================================

export type SopSection = {
  icon: "file" | "check" | "team" | "swap" | "tool" | "warning" | "stop" | "dollar" | "safety" | "user";
  color: string;
  title: string;
  content?: string;
  subTitle?: string;
  subItems?: string[];
  points?: string[];
};

export const SOP_SECTIONS: SopSection[] = [
  {
    icon: "file",
    color: "#2563eb",
    title: "1. Tujuan",
    content:
      "Menjamin penggunaan studio dan fasilitas berlangsung secara tertib, terkontrol, serta melindungi aset perusahaan dari risiko kerusakan dan kehilangan.",
  },
  {
    icon: "file",
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
    icon: "check",
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
    icon: "file",
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
    icon: "team",
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
    icon: "swap",
    color: "#d97706",
    title: "4.3 Serah Terima Studio",
    points: [
      "Serah terima wajib menggunakan Form Serah Terima (Form B).",
      "Dilakukan sebelum dan setelah penggunaan.",
      "Tanpa serah terima, kegiatan tidak diperkenankan dimulai.",
    ],
  },
  {
    icon: "tool",
    color: "#0891b2",
    title: "4.4 Penggunaan Equipment",
    points: [
      "Seluruh penggunaan equipment wajib dicatat dalam Log Equipment (Form C).",
      "Dilarang mengambil equipment tanpa izin.",
      "Dilarang memindahkan tanpa pencatatan.",
    ],
  },
  {
    icon: "check",
    color: "#059669",
    title: "4.5 Kondisi Studio",
    points: [
      "Wajib melakukan checklist kondisi studio setelah penggunaan.",
      "Wajib membersihkan area penggunaan.",
      "Wajib mengembalikan layout dan equipment ke kondisi semula.",
      "Seluruh barang wajib dikeluarkan pada hari yang sama setelah selesai.",
      "Barang yang ditinggalkan di area studio menjadi risiko pengguna sepenuhnya, bukan tanggung jawab Pengelola Studio.",
    ],
  },
  {
    icon: "warning",
    color: "#dc2626",
    title: "4.6 Kerusakan & Kehilangan",
    points: [
      "Kerusakan dan/atau kehilangan menjadi tanggung jawab pengguna.",
      "Wajib dilaporkan dalam Form Kerusakan/Kehilangan (Form D).",
      "Penggantian sesuai nilai kerugian yang ditetapkan perusahaan.",
      "Harga penggantian mencakup: harga barang, biaya pengiriman/procurement, biaya instalasi (jika ada), downtime/kerugian operasional (optional).",
    ],
  },
  {
    icon: "dollar",
    color: "#d97706",
    title: "4.7 Tarif & Pembayaran",
    points: [
      "Tarif dibedakan: Internal Production, External Production, Vendor / Pihak Ketiga.",
      "Sewa per jam berlaku minimum 3 jam; reminder 15 menit sebelum batas sewa berakhir untuk merapihkan peralatan.",
      "Sewa per hari: overtime dari waktu yang ditetapkan dihitung 1 hari tambahan.",
      "Detail tarif ditentukan dan diinformasikan oleh pihak pengelola studio.",
      "Internal: sesuai mekanisme internal.",
      "External: wajib pembayaran sebelum penggunaan / sesuai approval.",
      "Harga belum termasuk pajak.",
    ],
  },
  {
    icon: "stop",
    color: "#dc2626",
    title: "5. Larangan",
    points: [
      "Menggunakan studio tanpa persetujuan dari Pengelola Studio / Gedung.",
      "Tidak mengisi dan/atau tidak melengkapi formulir yang diwajibkan.",
      "Meninggalkan barang milik pribadi dan/atau milik team setelah masa sewa berakhir.",
      "Membawa keluar equipment tanpa izin.",
      "Meninggalkan studio dalam kondisi tidak layak.",
      "Merokok dan/atau menggunakan vape di area studio.",
      "Membawa senjata tajam, narkotika / obat terlarang, dan barang berbahaya lainnya.",
    ],
  },
  {
    icon: "user",
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
    icon: "safety",
    color: "#dc2626",
    title: "7. Sanksi",
    points: [
      "Penundaan dan/atau penghentian penggunaan fasilitas studio.",
      "Kewajiban pembayaran atas kerusakan/kehilangan dalam 1×24 jam.",
      "Pelanggaran hukum diproses sesuai peraturan perundang-undangan.",
    ],
  },
];
