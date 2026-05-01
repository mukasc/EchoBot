import { Link, useLocation } from "react-router-dom";
import { Scroll, Users, Settings, Bot, Home, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";

const Header = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const navItems = [
    { path: "/", label: t("header.sessions"), icon: Home },
    { path: "/characters", label: t("header.characters"), icon: Users },
    { path: "/bot-setup", label: t("header.botDiscord"), icon: Bot },
    { path: "/settings", label: t("header.settings"), icon: Settings },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-50 glass-header rounded-2xl mx-auto max-w-7xl animate-in-slide-up">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Scroll className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)] font-serif">
                {t("header.appTitle")}
              </h1>
              <p className="text-[10px] text-[var(--muted-foreground)] hidden sm:block uppercase tracking-wider">
                {t("header.appSubtitle")}
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
                        ? 'bg-primary/10 text-primary' 
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5'
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
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 px-2">
                  <div className="w-5 h-3.5 overflow-hidden rounded-sm flex-shrink-0 border border-border">
                    <img 
                      src={i18n.language === 'pt-BR' ? 'https://flagcdn.com/w40/br.png' : 'https://flagcdn.com/w40/us.png'} 
                      alt={i18n.language === 'pt-BR' ? t('header.languages.ptBR') : t('header.languages.enUS')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Globe className="w-4 h-4" />
                  <span className="sr-only">{t("language")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#12141A] border-border text-[var(--foreground)]">
                <DropdownMenuItem 
                  onClick={() => changeLanguage('pt-BR')}
                  className={`cursor-pointer focus:bg-white/10 flex items-center gap-3 ${i18n.language === 'pt-BR' ? 'bg-white/5 text-primary' : ''}`}
                >
                  <img src="https://flagcdn.com/w40/br.png" alt={t('header.languages.ptBR')} className="w-5 h-3.5 rounded-sm object-cover border border-border" />
                  {t("header.languages.ptBR")}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => changeLanguage('en-US')}
                  className={`cursor-pointer focus:bg-white/10 flex items-center gap-3 ${i18n.language === 'en-US' ? 'bg-white/5 text-primary' : ''}`}
                >
                  <img src="https://flagcdn.com/w40/us.png" alt={t('header.languages.enUS')} className="w-5 h-3.5 rounded-sm object-cover border border-border" />
                  {t("header.languages.enUS")}
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

