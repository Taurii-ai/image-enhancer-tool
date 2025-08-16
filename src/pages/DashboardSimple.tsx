import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DashboardSimple = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    console.log('DashboardSimple loading...');
    const userData = localStorage.getItem('enhpix_user');
    
    if (!userData) {
      console.log('No user data, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('User loaded:', parsedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="p-4 md:p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold">Enhpix Dashboard</h1>
          <Button 
            onClick={() => {
              localStorage.removeItem('enhpix_user');
              navigate('/');
            }}
            size="sm"
            className="text-sm"
          >
            Logout
          </Button>
        </div>
      </header>
      
      <div className="p-4 md:p-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg md:text-xl">Welcome {user.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-slate-300"><span className="font-medium">Plan:</span> {user.plan}</p>
              <p className="text-slate-300 text-sm md:text-base">This is a simplified dashboard to test functionality.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => navigate('/dashboard-full')} 
                className="flex-1"
                size="sm"
              >
                Go to Full Dashboard
              </Button>
              <Button 
                onClick={() => navigate('/pricing')} 
                variant="outline"
                className="flex-1"
                size="sm"
              >
                View Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSimple;