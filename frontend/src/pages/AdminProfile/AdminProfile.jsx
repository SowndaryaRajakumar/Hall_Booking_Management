import AdminLayout from "../../layouts/AdminLayout";
import ProfileView from "../../components/profile/ProfileView";

const AdminProfile = () => {
  return (
    <AdminLayout>
      <ProfileView role="admin" />
    </AdminLayout>
  );
};

export default AdminProfile;
