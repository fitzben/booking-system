import React from "react";
import { Space } from "antd";
import AdminLayout, { useAdminAuth } from "../layout/AdminLayout";
import PageHeader from "../ui/PageHeader";
import LandingMediaCard from "../media/LandingMediaCard";
import ContactSettingsCard from "../admin/ContactSettingsCard";
import RolePermissionsCard from "../admin/RolePermissionsCard";

export default function AdminSettingsPage() {
  const auth = useAdminAuth();
  const isSuperAdmin = auth?.userRole === "superadmin";

  return (
    <AdminLayout activeKey="settings">
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <PageHeader
          title="Pengaturan"
          subtitle="Kelola media dan konfigurasi tampilan publik"
        />
        {isSuperAdmin && <RolePermissionsCard />}
        <LandingMediaCard />
        <ContactSettingsCard />
      </Space>
    </AdminLayout>
  );
}
