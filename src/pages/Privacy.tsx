import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';

const Privacy = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleNavigation = (path: string) => {
    try {
      console.log(`Navigating to: ${path}`);
      navigate(path);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border relative">
        <nav className="max-w-7xl mx-auto flex items-center justify-between overflow-x-hidden w-full">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 bg-white rounded-lg">
              <EnhpixLogo className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold text-foreground">Enhpix</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>
              About
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
              Pricing
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-foreground"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
            <div className="flex flex-col p-4 space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleNavigation('/')}
                className="w-full justify-start text-foreground hover:text-primary"
              >
                Home
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleNavigation('/about')}
                className="w-full justify-start text-foreground hover:text-primary"
              >
                About
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleNavigation('/pricing')}
                className="w-full justify-start text-foreground hover:text-primary"
              >
                Pricing
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleNavigation('/login')}
                className="w-full justify-start"
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Privacy Content */}
      <div className="px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-20">
        <div className="max-w-4xl mx-auto overflow-x-hidden w-full">
          <div className="text-center mb-4 sm:mb-6 md:mb-12 px-1 sm:px-2">
            <h1 className="text-base sm:text-lg md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-4 sm:space-y-6 md:space-y-8 overflow-x-hidden w-full">
            <div>
              <h2 className="text-sm sm:text-base md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">Information We Collect</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere max-w-full">
                We collect information you provide directly to us, such as when you create an account, 
                upload images for enhancement, or contact us for support. This may include your email 
                address, account information, and the images you choose to enhance.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">How We Use Your Information</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere max-w-full">
                We use the information we collect to provide, maintain, and improve our image enhancement 
                services, process your requests, and communicate with you about your account and our services.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">Data Security</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere max-w-full">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </div>

            <div>
              <h2 className="text-sm sm:text-base md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">Contact Us</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere max-w-full">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:support@enhpix.com" className="text-primary hover:underline break-words overflow-wrap-anywhere">
                  support@enhpix.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;