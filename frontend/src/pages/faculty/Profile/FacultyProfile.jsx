import { Camera, Mail, Phone, Building2, BadgeCheck, IdCard, Pencil, Lock, RefreshCw } from "lucide-react";
import FacultyLayout from "../../../layouts/FacultyLayout";
import { useEffect, useState } from "react";
import { getProfile } from "../../../api/staffApi";
import EditFacultyModal from "../../FacultyManagement/EditFacultyModal";
import ChangePasswordModal from "../../../components/faculty/ChangePasswordModal";
import { useNavigate } from "react-router-dom";

const valueOrFallback = (value) => value !== null && value !== undefined && String(value).trim() ? value : "Not provided";
const initialsFor = (name) => String(name || "Faculty").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "F";
const imageUrlFor = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const path = image.startsWith("/") ? image : image.startsWith("uploads/") ? `/${image}` : `/uploads/${image}`;
  return `http://localhost:5000${path}`;
};

const FacultyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadProfile = async () => {
    try {
      setLoading(true); setError(""); setImageFailed(false);
      setProfile(await getProfile(localStorage.getItem("token")));
    } catch (err) {
      console.error("Failed to load faculty profile:", err);
      setProfile(null); setError("Unable to load profile information. Please try again.");
    } finally { setLoading(false); }
  };
  useEffect(() => { loadProfile(); }, []);

  const fields = [[Mail, "Email", profile?.email, "break-words"], [Phone, "Phone", profile?.phone], [Building2, "Department", profile?.department], [BadgeCheck, "Designation", profile?.designation], [IdCard, "Employee ID", profile?.employee_id || profile?.employeeId || profile?.staff_id, "break-words sm:col-span-2"]];
  const profileImage = imageUrlFor(profile?.profile_image);

  return <FacultyLayout><div className="mx-auto w-full max-w-6xl space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">My Profile</h1><p className="mt-2 text-sm text-slate-500">Manage your profile details and account preferences.</p></div>
    {profile?.is_first_login && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Your account is using a temporary password. Change it to keep your account secure.</div>}
    {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-600 shadow-sm">Loading profile...</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"><p className="text-sm font-medium text-red-700">{error}</p><button type="button" onClick={loadProfile} className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"><RefreshCw size={16} />Try again</button></div>}
    {profile && <div className="grid items-start gap-6 lg:grid-cols-[minmax(250px,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col items-center text-center"><div className="relative">{profileImage && !imageFailed ? <img src={profileImage} onError={() => setImageFailed(true)} alt={profile.full_name} className="h-28 w-28 rounded-full object-cover ring-4 ring-blue-50 sm:h-32 sm:w-32" /> : <div aria-label={`${profile.full_name} initials`} className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-700 text-3xl font-bold text-white ring-4 ring-blue-50 sm:h-32 sm:w-32">{initialsFor(profile.full_name)}</div>}<button type="button" aria-label="Edit profile" onClick={() => setIsEditOpen(true)} className="absolute bottom-0 right-0 rounded-full bg-blue-700 p-2 text-white shadow-lg hover:bg-blue-800"><Camera size={16} /></button></div><h2 className="mt-4 break-words text-xl font-semibold text-slate-800">{valueOrFallback(profile.full_name)}</h2><p className="mt-1 text-sm text-slate-500">{valueOrFallback(profile.designation)}</p><div className="mt-3 max-w-full break-words rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{valueOrFallback(profile.department)}</div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xl font-semibold text-slate-800">Profile Information</h3><p className="text-sm text-slate-500">Your academic and contact details.</p></div><button onClick={() => setIsEditOpen(true)} className="flex w-fit items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"><Pencil size={16} />Edit Profile</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map(([Icon, label, value, className = ""]) => <div key={label} className={`rounded-xl bg-slate-50 p-4 ${className}`}><div className="flex items-center gap-2 text-slate-500"><Icon size={16} /><span className="text-sm font-medium">{label}</span></div><p className="mt-2 text-sm font-semibold text-slate-700">{valueOrFallback(value)}</p></div>)}</div><div className="mt-6"><button type="button" onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"><Lock size={16} />Change Password</button></div></section>
    </div>}
    <EditFacultyModal isOpen={isEditOpen} faculty={profile} onClose={() => setIsEditOpen(false)} onSuccess={() => { setIsEditOpen(false); loadProfile(); }} allowRoleEdit={false} />
    <ChangePasswordModal isOpen={isPasswordModalOpen} email={profile?.email} onClose={() => setIsPasswordModalOpen(false)} onComplete={(message) => { alert(message); ['token', 'role', 'email', 'user', 'temporaryPasswordWarning'].forEach((key) => localStorage.removeItem(key)); navigate('/', { replace: true }); }} />
  </div></FacultyLayout>;
};
export default FacultyProfile;
