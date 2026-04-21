import React, { useMemo, useState, useEffect } from "react";
import { Button, DatePicker, Tooltip, Spin, Space, Tag, Segmented, Select } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getRooms, type Booking } from "../../lib/api";
import { parseDetails } from "../../lib/utils";
import {
  RUANGAN_OPTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../../lib/constants";
import type { BookingStatus } from "../../lib/constants";

interface BookingCalendarViewProps {
  bookings: Booking[];
  date: dayjs.Dayjs;
  onDateChange: (d: dayjs.Dayjs) => void;
  loading: boolean;
}

// Slot jam: 07:00 – 22:00 (16 baris)
const HOUR_SLOTS = Array.from({ length: 16 }, (_, i) => 7 + i);

const STATUS_BG: Partial<Record<BookingStatus, string>> = {
  pending: "#fef9c3",
  in_progress: "#dbeafe",
  approved: "#dcfce7",
};

const STATUS_BD: Partial<Record<BookingStatus, string>> = {
  pending: "#fde047",
  in_progress: "#93c5fd",
  approved: "#86efac",
};

export default function BookingCalendarView({
  bookings,
  date,
  onDateChange,
  loading,
}: BookingCalendarViewProps) {
  const [dbRooms, setDbRooms] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'1' | '3' | '7'>('1');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  useEffect(() => {
    getRooms()
      .then((res) => setDbRooms(res.map((r) => r.name)))
      .catch((err) => console.error("Failed to load rooms for calendar", err));
  }, []);

  const ROOM_COLS = useMemo(() => {
    const list = Array.from(
      new Set([...(dbRooms.length ? dbRooms : RUANGAN_OPTIONS)]),
    );
    const allRooms = list.filter((r) => r !== "Lainnya");
    if (selectedRooms.length > 0) {
      return allRooms.filter((r) => selectedRooms.includes(r));
    }
    return allRooms;
  }, [dbRooms, selectedRooms]);

  const dates = useMemo(() => {
    if (viewMode === '1') return [date];
    if (viewMode === '3') return [date, date.add(1, 'day'), date.add(2, 'day')];
    if (viewMode === '7') {
      const arr: dayjs.Dayjs[] = [];
      for(let i = 0; i < 7; i++) {
        arr.push(date.add(i, 'day'));
      }
      return arr;
    }
    return [date];
  }, [date, viewMode]);

  // Build: date → room → hour → Booking[]
  const grid = useMemo<Record<string, Record<string, Record<number, Booking[]>>>>(() => {
    const map: Record<string, Record<string, Record<number, Booking[]>>> = {};
    
    dates.forEach(d => {
      const dStr = d.format("YYYY-MM-DD");
      map[dStr] = {};
      ROOM_COLS.forEach((r) => {
        map[dStr][r] = {};
      });
    });

    bookings.forEach((b) => {
      // Jangan tampilkan booking yang ditolak atau selesai
      if (b.status === "rejected" || b.status === "finished") return;

      const d = parseDetails(b.details);
      const dateEnd = (d?.date_end as string) ?? b.date;

      // Gunakan b.room_name jika tersedia, fallback ke array d.ruangan lama
      const rooms: string[] = [];
      if (b.room_name) {
        rooms.push(b.room_name);
      } else {
        const legacyRooms = d?.ruangan as string[] | undefined;
        if (legacyRooms) rooms.push(...legacyRooms);
      }

      if (!rooms.length) return;

      const isFullDay = b.start_time === "00:00" && b.end_time === "23:59";
      const startH = isFullDay ? 7 : parseInt(b.start_time.split(":")[0], 10);
      const endHH = isFullDay ? 22 : parseInt(b.end_time.split(":")[0], 10);
      const endMM = isFullDay ? 59 : parseInt(b.end_time.split(":")[1], 10);
      // end_time "14:00" → slot 13 adalah slot terakhir yang terisi
      // end_time "14:30" → slot 14 juga terisi (belum berakhir)
      const lastH = endMM > 0 ? endHH : endHH - 1;

      dates.forEach(d_ => {
        const dStr = d_.format("YYYY-MM-DD");
        // Booking harus mencakup tanggal ini
        if (b.date > dStr || dateEnd < dStr) return;

        rooms.forEach((r) => {
          if (!map[dStr]?.[r]) return;
          for (let h = Math.max(7, startH); h <= Math.min(22, lastH); h++) {
            if (!map[dStr][r][h]) map[dStr][r][h] = [];
            if (!map[dStr][r][h].some((x) => x.id === b.id)) map[dStr][r][h].push(b);
          }
        });
      });
    });

    return map;
  }, [bookings, dates, ROOM_COLS]);

  const hasAny = dates.some(d => {
    const dStr = d.format("YYYY-MM-DD");
    return ROOM_COLS.some((r) =>
      HOUR_SLOTS.some((h) => (grid[dStr]?.[r]?.[h]?.length ?? 0) > 0),
    );
  });

  const jumpOffset = parseInt(viewMode, 10);
  const now = dayjs();

  return (
    <div style={{ padding: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Space>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Tampilan:</div>
          <Segmented
            options={[
              { label: '1 Hari', value: '1' },
              { label: '3 Hari', value: '3' },
              { label: '7 Hari', value: '7' },
            ]}
            value={viewMode}
            onChange={val => setViewMode(val as '1' | '3' | '7')}
          />
        </Space>
        
        <Space>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Filter Ruangan:</div>
          <Select
            mode="multiple"
            placeholder="Semua Ruangan"
            style={{ minWidth: 250, maxWidth: 400 }}
            value={selectedRooms}
            onChange={setSelectedRooms}
            allowClear
            options={dbRooms.length ? dbRooms.map(r => ({ label: r, value: r })) : RUANGAN_OPTIONS.filter(r => r !== 'Lainnya').map(r => ({ label: r, value: r }))}
            maxTagCount="responsive"
          />
        </Space>
      </div>

      {/* Bar navigasi tanggal */}
      <Space wrap size={8} style={{ marginBottom: 16 }}>
        <Button
          size="small"
          icon={<LeftOutlined />}
          onClick={() => onDateChange(date.subtract(jumpOffset, "day"))}
        />
        <DatePicker
          value={date}
          onChange={(d) => d && onDateChange(d)}
          format="dddd, DD MMMM YYYY"
          allowClear={false}
          size="small"
          style={{ width: 230 }}
        />
        <Button size="small" onClick={() => onDateChange(dayjs())}>
          Hari Ini
        </Button>
        <Button
          size="small"
          icon={<RightOutlined />}
          onClick={() => onDateChange(date.add(jumpOffset, "day"))}
        />

        {/* Legenda */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginLeft: 8,
            flexWrap: "wrap",
          }}
        >
          {(["pending", "in_progress", "approved"] as BookingStatus[]).map(
            (s) => (
              <span
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "#6b7280",
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    display: "inline-block",
                    background: STATUS_BG[s] ?? "#f3f4f6",
                    border: `1px solid ${STATUS_BD[s] ?? "#d1d5db"}`,
                  }}
                />
                {STATUS_LABELS[s]}
              </span>
            ),
          )}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "inline-block",
              }}
            />
            Tersedia
          </span>
        </div>
      </Space>

      <Spin spinning={loading}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 640 }}
          >
            <colgroup>
              <col style={{ width: 56 }} />
              {dates.map(d => ROOM_COLS.map((r) => (
                <col key={`${d.format('YYYY-MM-DD')}-${r}`} style={{ minWidth: 110 }} />
              )))}
            </colgroup>
            <thead>
              {dates.length > 1 ? (
                <>
                  <tr>
                    <th rowSpan={2} style={TH_STYLE}>Jam</th>
                    {dates.map(d => {
                      const isToday = d.format("YYYY-MM-DD") === now.format("YYYY-MM-DD");
                      return (
                        <th 
                          key={d.format('YYYY-MM-DD')} 
                          colSpan={ROOM_COLS.length} 
                          style={{
                            ...TH_STYLE, 
                            borderBottom: '1px solid #e5e7eb',
                            color: isToday ? '#ef4444' : '#374151'
                          }}
                        >
                          {d.format('dddd, DD MMM YYYY')}
                        </th>
                      )
                    })}
                  </tr>
                  <tr>
                    {dates.map(d => ROOM_COLS.map((r) => (
                      <th
                        key={`${d.format('YYYY-MM-DD')}-${r}`}
                        style={{
                          ...TH_STYLE,
                          background: '#fcfcfc',
                          fontSize: 11,
                          lineHeight: 1.4,
                          padding: "8px 6px",
                          fontWeight: 600,
                        }}
                      >
                        {r}
                      </th>
                    )))}
                  </tr>
                </>
              ) : (
                <tr>
                  <th style={TH_STYLE}>Jam</th>
                  {ROOM_COLS.map((r) => (
                    <th
                      key={r}
                      style={{
                        ...TH_STYLE,
                        fontSize: 11,
                        lineHeight: 1.4,
                        padding: "8px 6px",
                      }}
                    >
                      {r}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {HOUR_SLOTS.map((h) => {
                return (
                  <tr key={h}>
                    <td
                      style={{
                        ...TD_STYLE,
                        textAlign: "center",
                        color: "#9ca3af",
                        fontWeight: 600,
                        background: "#fafafa",
                        fontSize: 11,
                        padding: "4px 2px",
                      }}
                    >
                      {String(h).padStart(2, "0")}:00
                    </td>
                    {dates.map(d => {
                      const dStr = d.format("YYYY-MM-DD");
                      return ROOM_COLS.map((r) => {
                        const slot = grid[dStr]?.[r]?.[h] ?? [];
                        const booked = slot.length > 0;
                        const s = slot[0]?.status as BookingStatus | undefined;
                        
                        const isCurrentSlot = dStr === now.format("YYYY-MM-DD") && h === now.hour();

                        return (
                          <td
                            key={`${dStr}-${r}`}
                            style={{
                              ...TD_STYLE,
                              background:
                                booked && s && STATUS_BG[s]
                                  ? STATUS_BG[s]
                                  : "#f0fdf4",
                              borderColor:
                                booked && s && STATUS_BD[s]
                                  ? STATUS_BD[s]
                                  : "#bbf7d0",
                              ...(isCurrentSlot ? { boxShadow: "inset 0 0 0 2px #ef4444" } : {})
                            }}
                          >
                            {booked && (
                              <Tooltip
                                placement="top"
                                title={
                                  <div style={{ minWidth: 160 }}>
                                    {slot.map((b, idx) => (
                                      <div
                                        key={b.id}
                                        style={{
                                          marginBottom:
                                            idx < slot.length - 1 ? 8 : 0,
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontWeight: 700,
                                            fontSize: 12,
                                          }}
                                        >
                                          #{b.booking_code} — {b.applicant_name}
                                        </div>
                                        <div
                                          style={{ fontSize: 11, opacity: 0.85 }}
                                        >
                                          {b.start_time}–{b.end_time} ·{" "}
                                          {b.purpose}
                                        </div>
                                        <Tag
                                          color={
                                            STATUS_COLORS[
                                              b.status as BookingStatus
                                            ]
                                          }
                                          style={{
                                            margin: "3px 0 0",
                                            fontSize: 10,
                                          }}
                                        >
                                          {
                                            STATUS_LABELS[
                                              b.status as BookingStatus
                                            ]
                                          }
                                        </Tag>
                                      </div>
                                    ))}
                                  </div>
                                }
                              >
                                <div>
                                  {slot.map((b) => (
                                    <a
                                      key={b.id}
                                      href={`/admin/${b.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: "block",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: "#374151",
                                        textDecoration: "none",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      #{b.booking_code}{" "}
                                      {b.applicant_name.split(" ")[0]}
                                    </a>
                                  ))}
                                </div>
                              </Tooltip>
                            )}
                          </td>
                        );
                      });
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && !hasAny && (
          <div
            style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}
          >
            Tidak ada booking aktif pada rentang ini
          </div>
        )}
      </Spin>
    </div>
  );
}

const TH_STYLE: React.CSSProperties = {
  padding: "10px 8px",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  fontWeight: 700,
  color: "#374151",
  textAlign: "center",
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const TD_STYLE: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "3px 5px",
  verticalAlign: "top",
  height: 38,
};
