// Temporary backup of useAuth hook
import { useState, useEffect } from 'react'

export interface AuthUser {
  id: string
  email?: string
  profile?: {
    plan: string
    credits_remaining: number
  }
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)

  // Temporary mock for development
  useEffect(() => {
    // Mock user for testing
    const mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      profile: {
        plan: 'free',
        credits_remaining: 3
      }
    }
    
    // Simulate loading
    setTimeout(() => {
      setUser(mockUser)
      setLoading(false)
    }, 100)
  }, [])

  const signOut = async () => {
    setUser(null)
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    profile: user?.profile
  }
}