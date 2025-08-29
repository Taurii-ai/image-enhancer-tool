import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Wand2, Heart } from 'lucide-react';
import { EnhpixLogo } from '@/components/ui/enhpix-logo';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-border">
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
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate('/about')}
              className="bg-primary text-primary-foreground"
            >
              About
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
              Pricing
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>

          {/* Mobile Back Button */}
          <div className="md:hidden">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Mobile back button clicked - About');
                navigate('/');
              }}
              className="text-foreground bg-background hover:bg-muted min-h-[44px] px-4"
            >
              ← Back
            </Button>
          </div>
        </nav>
      </header>

      {/* About Content */}
      <div className="px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4 sm:mb-6 md:mb-16">
            <h1 className="text-base sm:text-lg md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
              About Enhpix
            </h1>
            <p className="text-xs sm:text-sm md:text-lg lg:text-xl text-muted-foreground px-1 sm:px-2">
              Transforming the way you enhance images with cutting-edge AI technology
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:gap-16">
            {/* Mission */}
            <div className="text-center px-1 sm:px-2">
              <h2 className="text-sm sm:text-base md:text-2xl lg:text-3xl font-bold text-foreground mb-2 sm:mb-3 md:mb-6">Our Mission</h2>
              <p className="text-xs leading-relaxed max-w-3xl mx-auto">
                At Enhpix, we believe that every image has the potential to be extraordinary. 
                Our mission is to make professional-grade image enhancement accessible to everyone, 
                from photographers and designers to everyday users who want to bring their memories to life.
              </p>
            </div>

            {/* Features */}
            <div className="px-1 sm:px-2">
              <h2 className="text-sm sm:text-base md:text-2xl lg:text-3xl font-bold text-foreground text-center mb-3 sm:mb-4 md:mb-12">
                What Makes Us Different
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 md:gap-8">
                <div className="p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl border border-border">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-md sm:rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                    Advanced AI Technology
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                    Our proprietary neural networks are trained on millions of high-quality images 
                    to deliver unparalleled enhancement results.
                  </p>
                </div>

                <div className="p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl border border-border">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-accent/10 rounded-md sm:rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-accent" />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                    Lightning Fast Processing
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                    Get professional results in seconds, not hours. Our optimized infrastructure 
                    ensures quick processing without compromising quality.
                  </p>
                </div>

                <div className="p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl border border-border">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-md sm:rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                    Simple Yet Powerful
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                    No complex settings or technical knowledge required. Upload, enhance, 
                    and download - it's that simple.
                  </p>
                </div>

                <div className="p-3 sm:p-4 md:p-6 bg-card rounded-lg sm:rounded-xl border border-border">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-accent/10 rounded-md sm:rounded-lg flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-accent" />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                    Made with Care
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                    Every pixel matters to us. We're constantly improving our algorithms 
                    to deliver the best possible results for your images.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center bg-gradient-subtle p-3 sm:p-4 md:p-12 rounded-xl md:rounded-2xl px-1 sm:px-2">
              <h2 className="text-sm sm:text-base md:text-3xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4 break-words overflow-wrap-anywhere max-w-full">
                Ready to enhance your images?
              </h2>
              <p className="text-xs sm:text-sm md:text-lg text-muted-foreground mb-3 sm:mb-4 md:mb-8 break-words overflow-wrap-anywhere max-w-full">
                Join thousands of users who trust Enhpix for their image enhancement needs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4 overflow-x-hidden w-full">
                <Button size="sm" className="sm:size-default md:size-lg" onClick={() => navigate('/pricing')}>
                  View Pricing Plans
                </Button>
                <Button variant="outline" size="sm" className="sm:size-default md:size-lg" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;