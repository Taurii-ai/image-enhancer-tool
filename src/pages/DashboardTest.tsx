import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardTest = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    console.log('DashboardTest loading...');
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
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#1a1828',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1a1828',
      color: 'white',
      padding: '20px'
    }}>
      <h1>Dashboard Test</h1>
      <p>User: {user.email}</p>
      <p>Plan: {user.plan}</p>
      <button onClick={() => navigate('/login')}>Back to Login</button>
    </div>
  );
};

export default DashboardTest;