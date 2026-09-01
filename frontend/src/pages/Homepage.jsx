// Homepage.jsx
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginForm from '../components/LoginForm';


const Homepage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div 
          className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4"
          style={{
            backgroundImage: 'url("/images/nec.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <LoginForm />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Homepage;
