import { useState } from "react";
import { ConfigProvider } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { MD_THEME } from "../../lib/theme";
import BookingFormSimple from "../booking/BookingFormSimple";
import "./BookingSection.css";

export default function BookingSection() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <StyleProvider ssrInline layer hashPriority="high">
      <ConfigProvider theme={MD_THEME}>
        <section id="booking-form" className="booking-section">
          <div className="booking-section-inner">
            {/* Header — hanya tampil saat belum submit */}
            {!submitted && (
              <div className="booking-header">
                <div className="booking-eyebrow">Formulir Peminjaman</div>
                <h2 className="booking-title">Ajukan Peminjaman</h2>
                <p className="booking-subtitle">
                  Isi formulir berikut untuk mengajukan peminjaman ruangan atau
                  studio kami. Tim kami akan menghubungi Anda untuk konfirmasi
                  lebih lanjut.
                </p>
              </div>
            )}

            <BookingFormSimple onSubmittedChange={setSubmitted} hideHeader />
          </div>
        </section>
      </ConfigProvider>
    </StyleProvider>
  );
}
