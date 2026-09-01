// Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#333333] text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Technical Support Section */}
          <div>
            <h2 className="text-white text-lg font-medium mb-3">For Technical Support</h2>
            <div className="space-y-1 text-gray-200">
              {/* <p>Dr. D. Venkatkumar M.E.,Ph.D</p>
              <p>Professor / Mechanical</p>
              <p>Engineering</p>
              <p>Email: dvkmech@nec.edu.in</p>
              <p>Ph: 9443660339</p> */}
            </div>
          </div>

          {/* Info Section */}
          <div>
            <h2 className="text-blue-500 text-lg font-medium mb-3">Info</h2>
            <div>
              <a 
                href="https://nec.edu.in" 
                className="text-white hover:text-blue-400 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                NEC WEBSITE
              </a>
            </div>
          </div>

          {/* Contact Us Section */}
          <div>
            <h2 className="text-blue-500 text-lg font-medium mb-3">Contact Us</h2>
            <div className="space-y-1 text-gray-200">
              <p>National Engineering College, K.R.</p>
              <p>Nagar, Kovilpatti - 628503.</p>
              <p>Thoothukudi District, Tamilnadu</p>
              <div className="mt-3">
                <p>Phone : 04632 – 222 502 93859</p>
                <p>76674, 93859 76684</p>
              </div>
              <div className="mt-3">
                <p>
                  Email : {' '}
                  <a 
                    href="mailto:principal@nec.edu.in" 
                    className="text-white hover:text-blue-400 underline"
                  >
                    principal@nec.edu.in
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Follow Us Section */}
          <div>
            <h2 className="text-blue-500 text-lg font-medium mb-3">Follow Us</h2>
            <div className="flex gap-2">
              <a 
                href="#twitter" 
                className="bg-[#1DA1F2] p-2 rounded-md hover:opacity-80 transition-opacity"
                aria-label="Twitter"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.061a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z"/>
            </svg>

              </a>
              <a 
                href="#google" 
                className="bg-[#DB4437] p-2 rounded-md hover:opacity-80 transition-opacity"
                aria-label="Google Plus"
              >
               <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.917 16.083c-2.258 0-4.083-1.825-4.083-4.083s1.825-4.083 4.083-4.083c1.103 0 2.024.402 2.735 1.067l-1.107 1.068c-.304-.292-.834-.63-1.628-.63-1.394 0-2.531 1.155-2.531 2.579 0 1.424 1.138 2.579 2.531 2.579 1.616 0 2.224-1.162 2.316-1.762h-2.316v-1.4h3.855c.036.204.064.408.064.677.001 2.332-1.563 3.988-3.919 3.988zm9.917-3.5h-1.75v1.75h-1.167v-1.75h-1.75v-1.166h1.75v-1.75h1.167v1.75h1.75v1.166z"/>
            </svg>

              </a>
              <a 
                href="#facebook" 
                className="bg-[#4267B2] p-2 rounded-md hover:opacity-80 transition-opacity"
                aria-label="Facebook"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>

              </a>
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </footer>
  );
};

export default Footer;