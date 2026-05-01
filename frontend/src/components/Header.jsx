import { Link, useLocation } from "react-router-dom";
import { Scroll, Users, Settings, Bot, Home, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const Header = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const navItems = [
    { path: "/", label: t("Sessões"), icon: Home },
    { path: "/characters", label: t("Personagens"), icon: Users },
    { path: "/bot-setup", label: t("Bot Discord"), icon: Bot },
    { path: "/settings", label: t("Configurações"), icon: Settings },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-50 glass-header rounded-2xl mx-auto max-w-7xl animate-in-slide-up">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-rpg-gold/10 group-hover:bg-rpg-gold/20 transition-colors">
              <Scroll className="w-6 h-6 text-rpg-gold" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#EDEDED] font-serif">
                {t("RPG Cronista")}
              </h1>
              <p className="text-[10px] text-[#6C7280] hidden sm:block uppercase tracking-wider">
                {t("Crônicas de Aventura")}
              </p>
            </div>
          </Link>

          {/* Right side: Navigation + Language Switcher */}
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${active 
                        ? 'bg-rpg-gold/10 text-rpg-gold' 
                        : 'text-[#A0A5B5] hover:text-[#EDEDED] hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#A0A5B5] hover:text-[#EDEDED] hover:bg-white/5">
                  <Globe className="w-5 h-5" />
                  <span className="sr-only">{t("language")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#12141A] border-white/10 text-[#EDEDED]">
                <DropdownMenuItem 
                  onClick={() => changeLanguage('pt-BR')}
                  className={`cursor-pointer focus:bg-white/10 ${i18n.language === 'pt-BR' ? 'bg-white/5 text-rpg-gold' : ''}`}
                >
                  {t("pt-BR")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => changeLanguage('en-US')}
                  className={`cursor-pointer focus:bg-white/10 ${i18n.language === 'en-US' ? 'bg-white/5 text-rpg-gold' : ''}`}
                >
                  {t("en-US")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
