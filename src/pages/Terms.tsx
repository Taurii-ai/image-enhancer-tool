import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';

const Terms = () => {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border relative">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
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

      {/* Terms Content */}
      <div className="px-3 md:px-6 py-6 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 md:mb-12 px-2">
            <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Terms of Service
            </h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Enhpix, you accept and agree to be bound by the terms and 
                provision of this agreement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Use License</h2>
              <p className="text-muted-foreground leading-relaxed">
                Permission is granted to use our image enhancement service for personal and commercial 
                purposes, subject to the restrictions outlined in these terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">User Content</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of the images you upload. By using our service, you grant us 
                permission to process your images for the purpose of providing enhancement services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to maintain service availability but cannot guarantee uninterrupted access. 
                We reserve the right to modify or discontinue services with notice.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at{' '}
                <a href="mailto:legal@enhpix.com" className="text-primary hover:underline">
                  legal@enhpix.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;