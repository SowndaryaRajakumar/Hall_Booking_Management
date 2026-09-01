// Navbar.jsx
import { Link } from 'react-router-dom';

const Navbar = () => {
  const isLoginPage = window.location.pathname === '/';

  return (
    <nav className="bg-[#2952E3] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center">
          {!isLoginPage && (
            <>
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src="/images/nec.jpg"
              alt="National Engineering College"
              className="h-10 w-10 rounded-md object-cover"
            />
          </div>

          {/* Navigation Links */}
          <div className="ml-4 flex items-center gap-2 sm:ml-6 sm:gap-6">
            <Link 
              to="/" 
              className="whitespace-nowrap rounded-md px-3 py-2 text-base text-white hover:bg-blue-600 sm:text-lg"
            >
              Home
            </Link>
            <Link 
              to="/halls" 
              className="whitespace-nowrap rounded-md px-3 py-2 text-base text-white hover:bg-blue-600 sm:text-lg"
            >
              Halls
            </Link>
           
          </div>
            </>
          )}
         
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
