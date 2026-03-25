import { Link, useLocation } from "react-router-dom";
import { Scroll, Users, Settings, Bot, Home } from "lucide-react";

const Header = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Sessões", icon: Home },
    { path: "/characters", label: "Personagens", icon: Users },
    { path: "/bot-setup", label: "Bot Discord", icon: Bot },
    { path: "/settings", label: "Configurações", icon: Settings },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 glass-header"
      data-testid="main-header"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
            data-testid="logo-link"
          >
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 group-hover:bg-[#D4AF37]/20 transition-colors">
              <Scroll className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#EDEDED] font-['Playfair_Display']">
                RPG Cronista
              </h1>
              <p className="text-xs text-[#6C7280] hidden sm:block">
                Crônicas de Aventura
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1" data-testid="main-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${active 
                      ? 'bg-[#D4AF37]/10 text-[#D4AF37]' 
                      : 'text-[#A0A5B5] hover:text-[#EDEDED] hover:bg-[#1A1B23]'
                    }
                  `}
                  data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
