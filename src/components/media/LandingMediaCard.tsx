import React, { useState, useEffect } from "react";
import {
  Card,
  Upload,
  Progress,
  message,
  Space,
  Typography,
  Tag,
  Spin,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { convertImageToWebP, convertVideoToWebM, uploadMedia } from "../../lib/mediaClient";
import { getSetting, setSetting } from "../../lib/api";

const { Dragger } = Upload;
const { Text } = Typography;

type ConversionStatus = "idle" | "converting" | "uploading" | "saving" | "done";

interface CurrentMedia {
  url: string;
  type: "image" | "video";
}

export default function LandingMediaCard() {
  const [current, setCurrent] = useState<CurrentMedia | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [messageApi, ctx] = message.useMessage();

  useEffect(() => {
    (async () => {
      try {
        const [urlRes, typeRes] = await Promise.all([
          getSetting("landing_bg_url"),
          getSetting("landing_bg_type"),
        ]);
        if (urlRes.value) {
          setCurrent({
            url: urlRes.value,
            type: (typeRes.value as "image" | "video") ?? "image",
          });
        }
      } catch {
        // no settings yet — silently ignore
      } finally {
        setLoadingCurrent(false);
      }
    })();
  }, []);

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
      let mediaType: "image" | "video";

      setProgress(0);

      if (isImage) {
        setStatus("converting");
        blob = await convertImageToWebP(file);
        mediaType = "image";
      } else if (WEB_COMPATIBLE_VIDEO.includes(file.type)) {
        blob = file;
        mediaType = "video";
      } else {
        setStatus("converting");
        blob = await convertVideoToWebM(file, setProgress);
        mediaType = "video";
      }

      setStatus("uploading");
      const { url } = await uploadMedia(blob, "landing", `bg-${Date.now()}`);

      setStatus("saving");
      await Promise.all([
        setSetting("landing_bg_url", url),
        setSetting("landing_bg_type", mediaType),
      ]);

      setCurrent({ url, type: mediaType });
      setStatus("done");
      messageApi.success("Background berhasil diupload!");
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "Upload gagal");
      setStatus("idle");
    }
  };

  const busy = status === "converting" || status === "uploading" || status === "saving";

  const uploadProps: UploadProps = {
    accept: "image/*,video/*",
    showUploadList: false,
    disabled: busy,
    beforeUpload: (file) => {
      void handleFile(file);
      return false;
    },
  };

  const statusLabel: Partial<Record<ConversionStatus, string>> = {
    converting: "Mengkonversi file...",
    uploading: "Mengupload ke R2...",
    saving: "Menyimpan setting...",
  };

  return (
    <>
      {ctx}
      <Card
        title="Background Landing Page"
        style={{ borderRadius: 12 }}
        extra={
          current && (
            <Tag color={current.type === "video" ? "blue" : "green"}>
              {current.type === "video" ? "Video" : "Gambar"} aktif
            </Tag>
          )
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Current preview */}
          {loadingCurrent ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : current ? (
            <div
              style={{
                borderRadius: 8,
                overflow: "hidden",
                background: "#000",
                maxHeight: 220,
                lineHeight: 0,
              }}
            >
              {current.type === "video" ? (
                <video
                  src={current.url}
                  muted
                  loop
                  autoPlay
                  playsInline
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover" }}
                />
              ) : (
                <img
                  src={current.url}
                  alt="Landing background"
                  style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
                />
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 16 }}>
              <Text type="secondary">Belum ada background aktif.</Text>
            </div>
          )}

          {/* Progress feedback */}
          {busy && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {statusLabel[status]}
              </Text>
              {status === "converting" && progress > 0 ? (
                <Progress percent={progress} size="small" style={{ marginTop: 4 }} />
              ) : (
                <Progress percent={100} status="active" size="small" style={{ marginTop: 4 }} />
              )}
            </div>
          )}

          {/* Drop zone */}
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Klik atau seret file gambar / video ke sini</p>
            <p className="ant-upload-hint">
              Gambar → WebP &nbsp;·&nbsp; MP4 / MOV / WebM diupload langsung &nbsp;·&nbsp; Format lain → WebM
            </p>
          </Dragger>
        </Space>
      </Card>
    </>
  );
}
