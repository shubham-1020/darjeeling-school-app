import React from 'react';
import { Mail, Phone, MapPin, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-[#050505] py-12">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Contact Us</h3>
          <ul className="space-y-3 text-sm text-foreground/60">
            <li className="flex items-center gap-3 justify-center md:justify-start">
              <MapPin size={16} className="text-secondary" />
              <span>Parbong Pulbazar, Bijanbari, Darjeeling</span>
            </li>
            <li className="flex items-center gap-3 justify-center md:justify-start">
              <Phone size={16} className="text-secondary" />
              <span>+91 97759 64455</span>
            </li>
            <li className="flex items-center gap-3 justify-center md:justify-start underline decoration-primary/20">
              <Mail size={16} className="text-secondary" />
              <a href="mailto:principal@vdei.in">principal@vdei.in</a>
            </li>
          </ul>
        </div>

        {/* School Branding */}
        <div className="space-y-4">
          <div className="flex justify-center md:justify-start">
            <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Vidya Deep
            </span>
          </div>
          <p className="text-xs text-foreground/40 leading-relaxed uppercase tracking-widest">
            Nurturing excellence <br />
            in the heart of the hills
          </p>
        </div>

        {/* Social Link */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Socials</h3>
          <div className="flex justify-center md:justify-start">
            <a 
              href="https://www.facebook.com/profile.php?id=100057611913354" 
              target="_blank" 
              rel="noreferrer" 
              className="p-3 rounded-full bg-white/5 border border-white/10 hover:border-primary/20 hover:bg-primary/5 transition-all text-foreground/60 hover:text-primary"
            >
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </div>
      
      <div className="mt-12 pt-8 border-t border-white/5 text-center">
        <p className="text-[10px] text-foreground/20 uppercase tracking-widest font-medium">
          © 2026 Vidya Deep Educational Institute. Crafted for Excellence.
        </p>
      </div>
    </footer>
  );
};

export default Footer;