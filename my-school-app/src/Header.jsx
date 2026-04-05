import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './setup';
import schoolLogo from './assets/school_logo1.jpg';

const Header = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Failed to log out.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#050505]/60 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img
              src={schoolLogo}
              alt="Logo"
              className="h-10 w-10 rounded-xl object-cover border border-primary/20 group-hover:scale-110 transition-transform"
            />
            <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Vidya Deep Institute
            </span>
            <span className="text-[10px] text-foreground/40 uppercase tracking-widest font-medium">Darjeeling, WB</span>
          </div>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/parent-dashboard" className="hidden sm:block text-sm font-medium text-foreground/60 hover:text-primary transition-colors">Dashboard</Link>
          <a 
            href="https://vdei.in" 
            target="_blank" 
            rel="noreferrer" 
            className="hidden sm:block text-sm font-medium text-foreground/60 hover:text-primary transition-colors"
          >
            Official Site
          </a>
          
          {auth.currentUser ? (
            <button
              onClick={handleLogout}
              className="px-5 py-2 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
            >
              Logout
            </button>
          ) : (
            <Link 
              to="/login"
              className="px-5 py-2 rounded-full bg-primary text-black text-xs font-bold hover:opacity-90 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
      {error && (
        <div className="absolute top-full left-0 w-full bg-red-500/10 text-red-500 text-[10px] text-center py-1 border-b border-red-500/10">
          {error}
        </div>
      )}
    </header>
  );
};

export default Header;