import { useState, useEffect } from "react";
import { StyleProvider } from '@ant-design/cssinjs';
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Drawer,
  Carousel,
  Typography,
  Divider,
  ConfigProvider,
  Space,
} from "antd";
import {
  CheckOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  ExpandOutlined,
  PhoneOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { getRoomsFull, getContactSettings, buildWaUrl } from "../../lib/api";
import type { RoomPricingTier, RoomMedia, RoomFull, ContactSettings } from "../../lib/api";
import { LANDING_COLORS, LANDING_THEME } from "../../lib/theme";
import "./RoomsSection.css";
import { ROOM_TYPE_OPTIONS } from "../../lib/constants";
import { fmtPrice } from "../../lib/utils";

const { Title, Text, Paragraph } = Typography;

// ── Per-type visual/styling data ─────────────────────────────────────────────

interface TypeStyle {
  color: string;
  tagColor: string;
  gradient: string;
}

const TYPE_STYLE: Record<string, TypeStyle> = {
  studio: {
    color: '#22d3ee',
    tagColor: 'cyan',
    gradient: 'linear-gradient(160deg,#060c12 0%,#0d1e14 55%,#040c18 100%)',
  },
  function_room: {
    color: '#60a5fa',
    tagColor: 'blue',
    gradient: 'linear-gradient(160deg,#040b24 0%,#0a1a3e 55%,#04091c 100%)',
  },
  meeting_room: {
    color: '#a78bfa',
    tagColor: 'purple',
    gradient: 'linear-gradient(160deg,#0d0a28 0%,#1a1642 55%,#08061e 100%)',
  },
  hall: {
    color: '#fbbf24',
    tagColor: 'gold',
    gradient: 'linear-gradient(160deg,#080810 0%,#14102a 55%,#060610 100%)',
  },
  other: {
    color: '#94a3b8',
    tagColor: 'default',
    gradient: 'linear-gradient(160deg,#0a0a0a 0%,#181828 55%,#0a0a0a 100%)',
  },
};

function getStyle(type: string): TypeStyle {
  return TYPE_STYLE[type] ?? TYPE_STYLE['other'];
}

function typeLabel(type: string) {
  return ROOM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function startingPrice(
  tiers: RoomPricingTier[],
  base: number | null,
): { price: number | null; suffix: string } {
  const effectiveBase = base === 0 ? null : base;

  if (!tiers.length) return { price: effectiveBase, suffix: "/ sesi" };

  const lowest = [...tiers].sort((a, b) => a.hours - b.hours)[0];
  const lowestPrice = lowest.price === 0 ? null : lowest.price;
  return { price: lowestPrice, suffix: `/ ${lowest.hours} jam` };
}

// ── Room Detail Drawer ────────────────────────────────────────────────────────

interface DetailDrawerProps {
  room: RoomFull | null;
  tiers: RoomPricingTier[];
  media: RoomMedia[];
  contactSettings: ContactSettings | null;
  onClose: () => void;
}

function RoomDetailDrawer({ room, tiers, media, contactSettings, onClose }: DetailDrawerProps) {
  if (!room) return null;
  const style = getStyle(room.type);
  const { price, suffix } = startingPrice(tiers, room.base_price);

  const desc = room.short_description || '';
  const facilities = room.facilities ?? [];
  const equipment = room.equipment_highlights ?? [];
  const roomMedia = (media || []).filter(
    (m) => m.room_id === room.id || String(m.room_id) === String(room.id),
  );
  const sortedMedia = [...roomMedia].sort((a, b) => {
    const aCover = a.is_cover ? 1 : 0;
    const bCover = b.is_cover ? 1 : 0;
    if (aCover !== bCover) return bCover - aCover;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const imageUrls = sortedMedia
    .filter((m) => m.type === "image" || !m.type) // Assume image if no type
    .map((m) => m.url);

  if (imageUrls.length === 0 && room.cover_image)
    imageUrls.push(room.cover_image);
  if (imageUrls.length === 0 && room.images?.length)
    imageUrls.push(...room.images);

  const slides = imageUrls.length > 0 ? imageUrls : [style.gradient];
  const realImages = imageUrls;

  return (
    <Drawer
      open={!!room}
      onClose={onClose}
      width={typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 480}
      closeIcon={<CloseOutlined />}
      title={null}
      styles={{
        body: { padding: 0 },
        header: { display: "none" },
        wrapper: { maxWidth: "100%" },
      }}
      destroyOnClose
    >
      <Carousel autoplay arrows draggable infinite autoplaySpeed={3000}>
        {slides.map((src, i) => (
          <div key={i}>
            <div
              className="detail-slide"
              style={
                realImages.length > 0
                  ? {
                      backgroundImage: `url(${src})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : { background: src as string }
              }
            >
              {!realImages.length && (
                <ExpandOutlined
                  style={{ fontSize: 28, color: "rgba(255,255,255,0.15)" }}
                />
              )}
              <div className="detail-slide-label">
                {room.name} — {i + 1}/{slides.length}
              </div>
            </div>
          </div>
        ))}
      </Carousel>

      <div className="detail-body">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Tag
            color={style.tagColor}
            style={{ fontSize: 11, fontWeight: 600, margin: 0 }}
          >
            {typeLabel(room.type)}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ color: "#94a3b8" }}
          />
        </div>

        <Title level={3} style={{ margin: "6px 0 4px", fontWeight: 800 }}>
          {room.name}
        </Title>

        <div style={{ marginBottom: 20 }}>
          {price != null ? (
            <>
              <span style={{ color: "#6b7280", fontSize: 13 }}>
                Mulai dari{" "}
              </span>
              <span style={{ color: "#0d1321", fontSize: 20, fontWeight: 700 }}>
                {fmtPrice(price)}
              </span>
              <span style={{ color: "#6b7280", fontSize: 13 }}> {suffix}</span>
            </>
          ) : contactSettings ? (
            <a
              href={buildWaUrl(contactSettings.contact_whatsapp, contactSettings.contact_wa_template)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <Space
                size={6}
                className="room-wa-contact"
                style={{
                  background: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.3)",
                  borderRadius: 8,
                  padding: "6px 14px",
                }}
              >
                <PhoneOutlined style={{ fontSize: 14, color: "#d97706" }} />
                <Text
                  style={{ color: "#d97706", fontWeight: 600, fontSize: 14 }}
                >
                  Hubungi Admin untuk Info Harga
                </Text>
              </Space>
            </a>
          ) : null}
        </div>

        {desc ? (
          <Paragraph
            style={{
              color: "#374151",
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            {desc}
          </Paragraph>
        ) : null}

        <Divider style={{ margin: "0 0 20px" }} />

        <div className="detail-section-title">Fasilitas</div>
        {facilities.length > 0 ? (
          facilities.map((f: string) => (
            <div key={f} className="detail-check-row">
              <CheckOutlined
                style={{
                  color: "#22d3ee",
                  fontSize: 13,
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: 14, color: "#374151" }}>{f}</Text>
            </div>
          ))
        ) : (
          <Text style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            Detail fasilitas segera tersedia
          </Text>
        )}

        <div style={{ marginTop: 24, marginBottom: 20 }}>
          <div className="detail-section-title">Equipment</div>
          {equipment.length > 0 ? (
            equipment.map((e: string) => (
              <div key={e} className="detail-check-row">
                <CheckOutlined
                  style={{
                    color: "#a78bfa",
                    fontSize: 13,
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: 14, color: "#374151" }}>{e}</Text>
              </div>
            ))
          ) : (
            <Text style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
              Detail equipment segera tersedia
            </Text>
          )}
        </div>

        <Divider style={{ margin: "0 0 24px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button
            type="primary"
            size="large"
            block
            href={`/booking?room_id=${room.id}`}
            onClick={onClose}
            className="detail-book-btn"
          >
            Book This Room
          </Button>

          {contactSettings && (
            <Button
              size="large"
              block
              icon={<WhatsAppOutlined />}
              href={buildWaUrl(
                contactSettings.contact_whatsapp,
                contactSettings.contact_wa_template,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-wa-btn"
            >
              Chat via WhatsApp
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: RoomFull;
  tiers: RoomPricingTier[];
  media: RoomMedia[];
  contactSettings: ContactSettings | null;
  onDetail: (room: RoomFull) => void;
}

function RoomCard({ room, tiers, media, contactSettings, onDetail }: RoomCardProps) {
  const style = getStyle(room.type);
  const { price, suffix } = startingPrice(tiers, room.base_price);
  const roomMedia = (media || []).filter(
    (m) => m.room_id === room.id || String(m.room_id) === String(room.id),
  );
  const sortedMedia = [...roomMedia].sort((a, b) => {
    const aCover = a.is_cover ? 1 : 0;
    const bCover = b.is_cover ? 1 : 0;
    if (aCover !== bCover) return bCover - aCover;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  const coverUrl =
    sortedMedia.find((m) => m.type === "image" || !m.type)?.url ||
    room.cover_image;
  const coverBg = coverUrl ? undefined : style.gradient;
  const facilities = room.facilities ?? [];

  return (
    <>
      <Card className="room-card" bordered={false}>
        <div
          className="room-cover"
          style={
            coverUrl
              ? {
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : { background: coverBg }
          }
        >
          <div className="room-cover-inner">
            <Tag
              color={style.tagColor}
              style={{ fontSize: 11, fontWeight: 600, margin: 0 }}
            >
              {typeLabel(room.type)}
            </Tag>
          </div>
        </div>

        <div className="room-card-body">
          <div className="room-card-title">
            {room.name}
          </div>

          <div className="room-price-row">
            {price != null ? (
              <>
                <span className="room-price-prefix">
                  Mulai dari{" "}
                </span>
                <span
                  style={{ color: style.color }}
                  className="room-price-value"
                >
                  {fmtPrice(price)}
                </span>
                <span className="room-price-suffix">
                  {" "}
                  {suffix}
                </span>
              </>
            ) : contactSettings ? (
              <a
                href={buildWaUrl(contactSettings.contact_whatsapp, contactSettings.contact_wa_template)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ textDecoration: "none" }}
              >
                <Space
                  size={4}
                  className="room-wa-contact"
                >
                  <PhoneOutlined style={{ fontSize: 12, color: "#d97706" }} />
                  <Text
                    style={{ color: "#d97706", fontWeight: 600, fontSize: 12 }}
                  >
                    Hubungi Admin untuk Info Harga
                  </Text>
                </Space>
              </a>
            ) : null}
          </div>

          <div className="room-facilities-list">
            {facilities.length > 0 ? (
              facilities.slice(0, 3).map((f: string) => (
                <div
                  key={f}
                  className="room-facility-item"
                >
                  <CheckOutlined
                    style={{
                      color: style.color,
                      fontSize: 12,
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <span className="room-facility-text">
                    {f}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: LANDING_COLORS.textMuted, fontSize: 13, fontStyle: "italic", opacity: 0.5 }}>
                Detail fasilitas segera tersedia
              </div>
            )}
          </div>

          <Button
            block
            icon={<ArrowRightOutlined />}
            onClick={() => onDetail(room)}
            className="room-btn-detail"
          >
            Lihat Detail
          </Button>
        </div>
      </Card>
    </>
  );
}

// ── RoomsSection ──────────────────────────────────────────────────────────────

export default function RoomsSection() {
  const [rooms, setRooms] = useState<RoomFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRoom, setDetailRoom] = useState<RoomFull | null>(null);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [data, contact] = await Promise.all([
          getRoomsFull(),
          getContactSettings(),
        ]);
        setRooms(data);
        setContactSettings(contact);
      } catch (err) {
        console.error("Error fetching rooms:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <StyleProvider ssrInline layer hashPriority="high">
    <ConfigProvider theme={LANDING_THEME}>
      <section id="rooms" className="rooms-section">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="rooms-header">
            <div className="rooms-section-eyebrow">Studio &amp; Ruangan</div>
            <Title
              level={2}
              className="rooms-title"
            >
              Pilih Ruangan yang Sesuai
            </Title>
            <Text className="rooms-subtitle">
              Tersedia berbagai pilihan studio dan ruangan profesional untuk
              kebutuhan produksi dan event Anda.
            </Text>
          </div>

          {loading ? (
            <>
              <Row gutter={[24, 24]}>
                {[1, 2, 3].map((i) => (
                  <Col key={i} xs={24} sm={12} lg={8}>
                    <div className="skel-card">
                      {/* Cover image area — 220px */}
                      <div
                        className="skel-bar"
                        style={{ height: 220, flexShrink: 0, borderRadius: 0 }}
                      />

                      {/* Card body — mirrors .room-card-body */}
                      <div className="room-card-body">
                        {/* Room name */}
                        <div
                          className="skel-bar"
                          style={{ width: "65%", height: 20, marginBottom: 10 }}
                        />

                        {/* Price row */}
                        <div
                          className="skel-bar"
                          style={{ width: "50%", height: 14, marginBottom: 20 }}
                        />

                        {/* 3 facility rows */}
                        <div className="room-facilities-list">
                          {[70, 85, 60].map((w, j) => (
                            <div
                              key={j}
                              className="skel-bar"
                              style={{
                                width: `${w}%`,
                                height: 12,
                                marginBottom: 10,
                              }}
                            />
                          ))}
                        </div>

                        {/* Button */}
                        <div
                          className="skel-bar"
                          style={{
                            width: "100%",
                            height: 44,
                            borderRadius: 10,
                          }}
                        />
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </>
          ) : (
            <Row gutter={[24, 24]}>
              {rooms.map((room) => (
                <Col key={room.id} xs={24} sm={12} lg={8}>
                  <RoomCard
                    room={room}
                    tiers={room.tiers}
                    media={room.media}
                    contactSettings={contactSettings}
                    onDetail={setDetailRoom}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </section>

      <RoomDetailDrawer
        room={detailRoom}
        tiers={detailRoom?.tiers ?? []}
        media={detailRoom?.media ?? []}
        contactSettings={contactSettings}
        onClose={() => setDetailRoom(null)}
      />
    </ConfigProvider>
    </StyleProvider>
  );
}
