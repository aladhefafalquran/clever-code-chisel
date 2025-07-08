
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  type: 'admin' | 'housekeeper';
  name: string;
  color: string;
}

interface UserContextType {
  currentUser: User | null;
  login: (userType: 'admin' | 'housekeeper', userId: string) => void;
  logout: () => void;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const getUserColor = (userId: string): string => {
  const colors: Record<string, string> = {
    'Admin': 'bg-red-500',
    'HK1': 'bg-blue-500',
    'HK2': 'bg-green-500',
    'HK3': 'bg-purple-500',
    'HK4': 'bg-orange-500'
  };
  return colors[userId] || 'bg-gray-500';
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('hotelUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser({
          ...userData,
          color: getUserColor(userData.id)
        });
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('hotelUser');
      }
    }
  }, []);

  const login = (userType: 'admin' | 'housekeeper', userId: string) => {
    const user: User = {
      id: userId,
      type: userType,
      name: userId,
      color: getUserColor(userId)
    };
    
    setCurrentUser(user);
    localStorage.setItem('hotelUser', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hotelUser');
  };

  const isAdmin = currentUser?.type === 'admin';

  return (
    <UserContext.Provider value={{ currentUser, login, logout, isAdmin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
