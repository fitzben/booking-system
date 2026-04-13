import React, { useEffect, useState } from "react";
import {
  Upload,
  Button,
  Progress,
  message,
  Space,
  Tooltip,
  Spin,
  Typography,
  Empty,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  StarFilled,
  StarOutlined,
  DeleteOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { convertImageToWebP, convertVideoToWebM, uploadMedia } from "../../lib/mediaClient";
import { getRoomMedia, addRoomMedia, deleteRoomMedia, setRoomMediaCover } from "../../lib/api";
import type { Room } from "../../lib/api";
import type { RoomMedia } from "../../lib/api";

const { Text } = Typography;

interface Props {
  room: Room;
  onSaved: () => void;
  onCountChange?: (count: number) => void;
}

const isVideoUrl = (url: string) => /\.(webm|mp4|mov|avi)(\?|$)/i.test(url);

export default function RoomMediaSection({ room, onSaved, onCountChange }: Props) {
  const [media, setMedia] = useState<RoomMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "converting" | "uploading">("idle");
  const [progress, setProgress] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [messageApi, ctx] = message.useMessage();

  // ── Fetch media ────────────────────────────────────────────────────────────

  const fetchMedia = async () => {
    try {
      const items = await getRoomMedia(room.id);
      setMedia(items);
      onCountChange?.(items.length);
    } catch {
      messageApi.error("Gagal memuat media.");
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [room.id]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      messageApi.error("File harus berupa gambar atau video.");
      return;
    }

    const WEB_COMPATIBLE_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

    try {
      let blob: Blob;
      setProgress(0);

      if (isImage) {
        setUploadStatus("converting");
        blob = await convertImageToWebP(file);
      } else if (WEB_COMPATIBLE_VIDEO.includes(file.type)) {
        blob = file;
      } else {
        setUploadStatus("converting");
        blob = await convertVideoToWebM(file, setProgress);
      }

      setUploadStatus("uploading");
      const { url, contentType } = await uploadMedia(
        blob,
        `rooms/${room.id}`,
        `media-${Date.now()}`,
      );

      const type = contentType.startsWith("video/") ? "video" : "image";
      await addRoomMedia({ room_id: room.id, url, type, sort_order: media.length });

      messageApi.success("Media berhasil diupload!");
      onSaved();
      await fetchMedia();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploadStatus("idle");
      setProgress(0);
    }
  };

  // ── Set cover ──────────────────────────────────────────────────────────────

  const handleSetCover = async (item: RoomMedia) => {
    setBusyId(item.id);
    try {
      await setRoomMediaCover(item.id, room.id);
      messageApi.success("Cover berhasil diatur!");
      onSaved();
      await fetchMedia();
    } catch {
      messageApi.error("Gagal mengatur cover.");
    } finally {
      setBusyId(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (item: RoomMedia) => {
    setBusyId(item.id);
    try {
      await deleteRoomMedia(item.id);
      messageApi.success("Media berhasil dihapus.");
      onSaved();
      await fetchMedia();
    } catch {
      messageApi.error("Gagal menghapus media.");
    } finally {
      setBusyId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const uploading = uploadStatus !== "idle";

  const uploadProps: UploadProps = {
    accept: "image/*,video/*",
    showUploadList: false,
    multiple: false,
    disabled: uploading,
    beforeUpload: (file) => {
      void handleFile(file);
      return false;
    },
  };

  return (
    <>
      {ctx}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {/* Gallery grid */}
        {loadingMedia ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin size="small" />
          </div>
        ) : media.length === 0 ? (
          <Empty description="Belum ada media" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 8,
            }}
          >
            {media.map((item) => (
              <MediaTile
                key={item.id}
                item={item}
                isBusy={busyId === item.id}
                onSetCover={() => handleSetCover(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {uploadStatus === "converting" ? "Mengkonversi file..." : "Mengupload ke R2..."}
            </Text>
            {uploadStatus === "converting" && progress > 0 ? (
              <Progress percent={progress} size="small" style={{ marginTop: 4 }} />
            ) : (
              <Progress percent={100} status="active" size="small" style={{ marginTop: 4 }} />
            )}
          </div>
        )}

        {/* Upload button */}
        <Space size={8} align="center">
          <Upload {...uploadProps}>
            <Button icon={<PlusOutlined />} disabled={uploading} loading={uploading}>
              Tambah Gambar / Video
            </Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Gambar → WebP · MP4/MOV/WebM langsung · Lain → WebM
          </Text>
        </Space>
      </Space>
    </>
  );
}

// ── Tile sub-component ────────────────────────────────────────────────────────

interface TileProps {
  item: RoomMedia;
  isBusy: boolean;
  onSetCover: () => void;
  onDelete: () => void;
}

function MediaTile({ item, isBusy, onSetCover, onDelete }: TileProps) {
  const [hovered, setHovered] = useState(false);
  const isCover = item.is_cover === 1;
  const isVideo = item.type === "video" || isVideoUrl(item.url);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        overflow: "hidden",
        background: "#000",
        aspectRatio: "16/9",
        border: isCover ? "2px solid #C9A227" : "2px solid transparent",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Media */}
      {isVideo ? (
        <video
          src={item.url}
          muted
          loop
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <img
          src={item.url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}

      {/* Hover overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          opacity: hovered || isBusy ? 1 : 0,
          transition: "opacity 0.15s",
        }}
      >
        {isBusy ? (
          <Spin size="small" />
        ) : (
          <>
            <Tooltip title={isCover ? "Cover aktif" : "Jadikan cover"}>
              <Button
                size="small"
                type="text"
                icon={
                  isCover ? (
                    <StarFilled style={{ color: "#C9A227" }} />
                  ) : (
                    <StarOutlined style={{ color: "#fff" }} />
                  )
                }
                onClick={onSetCover}
                disabled={isCover}
                style={{ color: "#fff" }}
              />
            </Tooltip>
            <Popconfirm
              title="Hapus media ini?"
              onConfirm={onDelete}
              okText="Hapus"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Hapus">
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined style={{ color: "#ff7875" }} />}
                />
              </Tooltip>
            </Popconfirm>
          </>
        )}
      </div>

      {/* Cover badge */}
      {isCover && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            background: "#C9A227",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: 10,
            color: "#000",
            fontWeight: 600,
            lineHeight: "16px",
          }}
        >
          Cover
        </div>
      )}

      {/* Video icon */}
      {isVideo && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            color: "rgba(255,255,255,0.8)",
            fontSize: 14,
          }}
        >
          <VideoCameraOutlined />
        </div>
      )}
    </div>
  );
}
