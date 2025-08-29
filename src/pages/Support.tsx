import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, FileText, Menu, X } from 'lucide-react';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';

const Support = () => {
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

      {/* Support Content */}
      <div className="px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-20">
        <div className="max-w-4xl mx-auto overflow-x-hidden w-full">
          <div className="text-center mb-4 sm:mb-6 md:mb-16 px-1 sm:px-2">
            <h1 className="text-base sm:text-lg md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">
              Support Center
            </h1>
            <p className="text-xs sm:text-sm md:text-lg lg:text-xl text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
              We're here to help you get the most out of Enhpix
            </p>
          </div>

          <div className="flex justify-center mb-4 sm:mb-6 md:mb-16 px-1 sm:px-2">
            <div className="text-center p-4 sm:p-6 md:p-8 bg-card rounded-lg sm:rounded-xl border border-border max-w-md">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-primary/10 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6">
                <Mail className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4">Email Support</h3>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4 sm:mb-6">
                Get personalized help from our support team
              </p>
              <Button 
                onClick={() => window.open('mailto:support@enhpix.com?subject=Support Request', '_blank')}
                className="w-full"
                size="lg"
              >
                Contact Support
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-8 border border-border overflow-x-hidden w-full">
            <h2 className="text-sm sm:text-base md:text-2xl font-bold text-foreground mb-3 sm:mb-4 md:mb-6 text-center break-words overflow-wrap-anywhere max-w-full">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-1 sm:mb-2 break-words overflow-wrap-anywhere max-w-full">
                  How does AI image enhancement work?
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                  Our AI uses advanced neural networks to analyze your images and intelligently 
                  upscale them while preserving and enhancing details, colors, and textures.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-1 sm:mb-2 break-words overflow-wrap-anywhere max-w-full">
                  What image formats do you support?
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                  We support all common image formats including JPEG, PNG, WebP, and TIFF. 
                  Maximum file size is 50MB per image.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-1 sm:mb-2 break-words overflow-wrap-anywhere max-w-full">
                  How long does processing take?
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-words overflow-wrap-anywhere max-w-full">
                  Most images are processed within 30 seconds. Larger images or higher enhancement 
                  levels may take up to 2-3 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;