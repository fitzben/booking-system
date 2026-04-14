import React, { useState, useEffect, useRef } from "react";
import {
  ConfigProvider,
  Layout,
  Menu,
  Button,
  Form,
  Input,
  Card,
  Space,
  Typography,
  Spin,
  Modal,
  notification,
  Badge,
  Tag,
} from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import {
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  SettingOutlined,
  BarChartOutlined,
  LogoutOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  PictureOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { AdminRole } from "../../lib/constants";
import {
  login,
  logout as apiLogout,
  getBookingUnreadCount,
} from "../../lib/api";
import { MD_THEME, COLORS } from "../../lib/theme";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export interface AdminAuthContextType {
  userRole: AdminRole | null;
  currentUsername: string;
  permissions: Record<string, string>;
}

export const AdminAuthContext =
  React.createContext<AdminAuthContextType | null>(null);

export const useAdminAuth = () => {
  const context = React.useContext(AdminAuthContext);
  return context;
};

const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 80;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit

export default function AdminLayout({
  children,
  activeKey,
}: {
  children: React.ReactNode;
  activeKey: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [userRole, setUserRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [form] = Form.useForm();
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Verifikasi session via server — satu-satunya sumber kebenaran auth.
    // Cookies dikirim otomatis; username/role dikembalikan bila session valid.
    fetch("/api/auth/me")
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ username: string; role: AdminRole; permissions: Record<string, string> }>)
          : null,
      )
      .then((data) => {
        if (data) {
          setCurrentUsername(data.username);
          setUserRole(data.role);
          setPermissions(data.permissions ?? {});
          setAuthed(true);
        } else {
          setAuthed(false);
        }
      })
      .catch(() => setAuthed(false));

    const handleResize = () => {
      if (typeof window === "undefined") return;
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };

    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      // login() POST ke /api/auth/login — server buat session + set cookie HttpOnly
      await login(values.username, values.password);
      // Fetch full session data (includes permissions) after login
      const r = await fetch("/api/auth/me");
      const data = r.ok
        ? (await r.json() as { username: string; role: AdminRole; permissions: Record<string, string> })
        : null;
      if (data) {
        setCurrentUsername(data.username);
        setUserRole(data.role);
        setPermissions(data.permissions ?? {});
        setAuthed(true);
      }
    } catch {
      setLoginError("Username atau password salah. Silakan coba lagi.");
    }
    setLoginLoading(false);
  };

  const handleLogout = (
    reason?: "inactivity" | "unauthorized" | "permission_changed",
  ) => {
    apiLogout().catch(() => undefined); // hapus session di server + clear cookie
    setAuthed(false);
    setCurrentUsername("");
    setUserRole(null);
    setPermissions({});
    setShowTimeoutWarning(false);
    form.resetFields();
    setLoginError("");

    if (reason === "inactivity") {
      notification.warning({
        message: "Sesi Berakhir",
        description:
          "Anda telah logout otomatis karena tidak aktif selama 30 menit.",
        duration: 0,
      });
    } else if (reason === "unauthorized") {
      notification.error({
        message: "Sesi Tidak Valid",
        description: "Kredensial Anda tidak lagi valid. Silakan login kembali.",
        duration: 0,
      });
    } else if (reason === "permission_changed") {
      notification.warning({
        message: "Permission Diperbarui",
        description:
          "Hak akses sistem telah diperbarui. Silakan login kembali.",
        duration: 0,
      });
    }
  };

  const handleUnauthorized = () => {
    handleLogout("unauthorized");
  };

  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      inactivityTimer.current = setTimeout(() => {
        setShowTimeoutWarning(false);
        handleLogout("inactivity");
      }, 60_000);
    }, INACTIVITY_TIMEOUT_MS - 60_000);
  };

  useEffect(() => {
    if (!authed) return;
    resetTimer();
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true }),
    );
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        handleUnauthorized();
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [authed]);

  // Fetch sekali saat mount — tanpa polling
  useEffect(() => {
    if (!authed || !userRole) return;
    if (permissions?.bookings === "none") return;

    getBookingUnreadCount()
      .then((data) => setUnreadCount(data.unread_count))
      .catch(() => undefined);
  }, [authed, userRole, permissions]);

  const hasPerm = (resource: string) => {
    const level = permissions?.[resource] ?? 'none';
    return level !== 'none';
  };
  const canAccessBookings = hasPerm('bookings');
  const canAccessRooms = hasPerm('rooms');
  const canAccessInventory = hasPerm('inventory');
  const canAccessUsers = hasPerm('users');
  const canAccessReports = hasPerm('reports');
  const canAccessSettings = hasPerm('settings');

  const navItems = [
    canAccessReports && {
      key: "reports",
      icon: <BarChartOutlined />,
      label: <a href="/admin/reports">Laporan</a>,
    },
    canAccessBookings && {
      key: "bookings",
      icon: <UnorderedListOutlined />,
      label: (
        <a href="/admin">
          Bookings
          {unreadCount > 0 && (
            <Badge
              count={unreadCount}
              size="small"
              style={{ marginLeft: 8, backgroundColor: "#d97706" }}
            />
          )}
        </a>
      ),
    },
    canAccessRooms && {
      key: "rooms",
      icon: <AppstoreOutlined />,
      label: <a href="/admin/rooms">Ruangan</a>,
    },
    (canAccessBookings || canAccessInventory || canAccessRooms) && {
      type: "divider" as const,
    },
    canAccessInventory && {
      key: "inventory",
      icon: <ToolOutlined />,
      label: <a href="/admin/inventory">Inventaris</a>,
    },
    canAccessUsers && {
      key: "users",
      icon: <TeamOutlined />,
      label: <a href="/admin/users">Users</a>,
    },
    canAccessSettings && {
      key: "settings",
      icon: <SettingOutlined />,
      label: <a href="/admin/settings">Pengaturan</a>,
    },
  ].filter(Boolean) as import("antd").MenuProps["items"];

  if (authed === null) {
    return (
      <StyleProvider ssrInline layer hashPriority="high">
        <ConfigProvider theme={MD_THEME}>
          <div
            style={{
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: COLORS.bgGray,
            }}
          >
            <Spin size="large" />
          </div>
        </ConfigProvider>
      </StyleProvider>
    );
  }

  if (!authed) {
    return (
      <StyleProvider ssrInline layer hashPriority="high">
        <ConfigProvider theme={MD_THEME}>
          <div
            style={{
              minHeight: "100vh",
              background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Card
              style={{ width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
              bordered={false}
            >
              <Space direction="vertical" size={24} style={{ width: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <img
                    src="/MDE_logo.png"
                    alt="MD Entertainment Logo"
                    style={{
                      height: 64,
                      width: "auto",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: "block", marginTop: 20 }}
                  >
                    Admin Console — masukkan kredensial untuk lanjut
                  </Text>
                </div>

                <Form form={form} onFinish={handleLogin} layout="vertical">
                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[
                      { required: true, message: "Username wajib diisi" },
                    ]}
                  >
                    <Input placeholder="Masukkan username admin" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Password"
                    validateStatus={loginError ? "error" : ""}
                    help={loginError || undefined}
                    rules={[
                      { required: true, message: "Password wajib diisi" },
                    ]}
                  >
                    <Input.Password
                      placeholder="Masukkan password admin"
                      size="large"
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={loginLoading}
                    >
                      Masuk
                    </Button>
                  </Form.Item>
                </Form>
              </Space>
            </Card>
          </div>
        </ConfigProvider>
      </StyleProvider>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ userRole, currentUsername, permissions }}>
      <StyleProvider ssrInline layer hashPriority="high">
        <ConfigProvider theme={MD_THEME}>
          <Layout style={{ minHeight: "100vh" }}>
            <Sider
              collapsible
              collapsed={collapsed}
              onCollapse={setCollapsed}
              width={SIDER_WIDTH}
              collapsedWidth={isMobile ? 0 : SIDER_COLLAPSED_WIDTH}
              theme="dark"
              breakpoint="lg"
              onBreakpoint={(broken) => {
                setIsMobile(broken);
                if (broken) setCollapsed(true);
              }}
              style={{
                background: COLORS.navyDark,
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 200,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: collapsed ? "18px 0" : "18px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 10,
                  transition: "all 0.2s",
                }}
              >
                <img src="/MDE_logo.png" alt="Logo" width={35} height={20} />
                {!collapsed && (
                  <div>
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        lineHeight: 1.3,
                      }}
                    >
                      MD Entertainment
                    </div>
                    <div
                      style={{
                        color: COLORS.gold,
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Admin Console
                    </div>
                  </div>
                )}
              </div>

              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[activeKey]}
                items={navItems}
                style={{
                  background: COLORS.navyDark,
                  border: "none",
                  marginTop: 8,
                }}
              />
            </Sider>

            <Layout
              style={{
                marginLeft: collapsed
                  ? isMobile
                    ? 0
                    : SIDER_COLLAPSED_WIDTH
                  : SIDER_WIDTH,
                transition: "margin-left 0.2s",
              }}
            >
              <Header
                style={{
                  background: COLORS.navy,
                  padding: "0 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "sticky",
                  top: 0,
                  zIndex: 100,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                  height: 56,
                }}
              >
                <Space align="center">
                  <Button
                    type="text"
                    icon={
                      collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
                    }
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                      fontSize: "16px",
                      width: 40,
                      height: 40,
                      color: "rgba(255,255,255,0.7)",
                      display: isMobile ? "flex" : collapsed ? "flex" : "none",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: isMobile ? "none" : "inline",
                    }}
                  >
                    Studio &amp; Room Booking Admin
                  </Text>
                </Space>

                <Space size={12}>
                  {currentUsername && !isMobile && (
                    <Text
                      style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}
                    >
                      {currentUsername}
                    </Text>
                  )}
                  <Button
                    type="text"
                    icon={<LogoutOutlined />}
                    onClick={() => handleLogout()}
                    style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}
                  >
                    {(!collapsed || isMobile) && "Keluar"}
                  </Button>
                </Space>
              </Header>

              <Content
                style={{
                  padding: isMobile ? 12 : 24,
                  background: COLORS.bgGray,
                  minHeight: "calc(100vh - 56px)",
                }}
              >
                {children}
              </Content>
            </Layout>
          </Layout>

          <Modal
            open={showTimeoutWarning}
            title="Sesi Akan Berakhir"
            closable={false}
            maskClosable={false}
            footer={[
              <Button
                key="stay"
                type="primary"
                onClick={() => {
                  resetTimer();
                  setShowTimeoutWarning(false);
                }}
              >
                Tetap Masuk
              </Button>,
              <Button
                key="logout"
                danger
                onClick={() => handleLogout("inactivity")}
              >
                Keluar Sekarang
              </Button>,
            ]}
          >
            Anda tidak aktif selama 29 menit. Sesi akan otomatis berakhir dalam
            1 menit.
          </Modal>
        </ConfigProvider>
      </StyleProvider>
    </AdminAuthContext.Provider>
  );
}
