import { Menu, Bell, UserCircle } from "lucide-react";

const Topbar = ({ toggleSidebar }) => {

  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex min-h-16 items-center justify-between gap-3 bg-white px-4 shadow-sm sm:px-6">

      {/* Left Section */}
      <div className="flex items-center gap-4">

        <button
          onClick={toggleSidebar}
          className="ui-icon-button text-gray-600 hover:bg-blue-50 hover:text-blue-700"
          aria-label="Toggle navigation"
        >
          <Menu size={24} />
        </button>

        <div>
          <h2 className="truncate text-base font-semibold text-gray-800 sm:text-xl">
            NEC Smart Venue Management
          </h2>

          <p className="hidden text-sm text-gray-500 sm:block">
            {formattedDate}
          </p>
        </div>

      </div>

      {/* Right Section */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">

        <button className="ui-icon-button text-gray-600 hover:bg-blue-50 hover:text-blue-700" aria-label="Notifications">
          <Bell size={22} />
        </button>

        <div className="flex items-center gap-2">

          <UserCircle size={34} className="text-blue-700" />

          <div className="hidden sm:block">
            <p className="font-semibold text-gray-700">
              Admin
            </p>

            <p className="text-xs text-gray-500">
              Administrator
            </p>
          </div>

        </div>

      </div>

    </header>
  );
};

export default Topbar;
