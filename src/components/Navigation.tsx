import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';

interface NavigationProps {
  currentPage?: 'home' | 'about' | 'pricing' | 'login';
  variant?: 'light' | 'dark';
}

export const Navigation = ({ currentPage = 'home', variant = 'dark' }: NavigationProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll position for transparency effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const textColor = variant === 'light' ? 'text-foreground' : 'text-white';
  const logoTextColor = variant === 'light' ? 'text-foreground' : 'text-white';

  const navigationItems = [
    { key: 'home', label: 'Home', path: '/' },
    { key: 'about', label: 'About', path: '/about' },
    { key: 'pricing', label: 'Pricing', path: '/pricing' },
    { key: 'login', label: 'Sign In', path: '/login', variant: 'outline' as const }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[99999] p-4 md:p-6 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm' 
        : variant === 'light' 
          ? 'bg-white border-b border-border'
          : 'bg-transparent'
    }`}>
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-2 bg-white rounded-lg">
            <EnhpixLogo className="w-8 h-8" />
          </div>
          <span className={`text-xl font-bold ${logoTextColor}`}>Enhpix</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          {navigationItems.map((item) => (
            <Button
              key={item.key}
              variant={currentPage === item.key ? 'default' : (item.variant || 'ghost')}
              size="sm"
              onClick={() => handleNavigation(item.path)}
              className={
                currentPage === item.key
                  ? 'bg-primary text-primary-foreground'
                  : item.variant === 'outline'
                  ? ''
                  : `${textColor} hover:text-primary`
              }
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={textColor}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden absolute top-full left-0 right-0 border-b border-border z-[99998] ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md' 
            : 'bg-white'
        }`}>
          <div className="flex flex-col p-4 space-y-2">
            {navigationItems.map((item) => (
              <Button
                key={item.key}
                variant={currentPage === item.key ? 'default' : (item.variant || 'ghost')}
                size="sm"
                onClick={() => handleNavigation(item.path)}
                className={`w-full justify-start ${
                  currentPage === item.key
                    ? 'bg-primary text-primary-foreground'
                    : item.variant === 'outline'
                    ? ''
                    : textColor
                }`}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};