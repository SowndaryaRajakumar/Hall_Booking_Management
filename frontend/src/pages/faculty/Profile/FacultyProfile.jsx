import FacultyLayout from "../../../layouts/FacultyLayout";
import ProfileView from "../../../components/profile/ProfileView";

const FacultyProfile = () => {
  return (
    <FacultyLayout>
      <ProfileView role="faculty" />
    </FacultyLayout>
  );
};

export default FacultyProfile;
