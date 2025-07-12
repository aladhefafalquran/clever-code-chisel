
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
    // User session is now handled in memory only
    // No automatic login from localStorage
    console.log('UserProvider initialized - user must login manually');
  }, []);

  const login = (userType: 'admin' | 'housekeeper', userId: string) => {
    const user: User = {
      id: userId,
      type: userType,
      name: userId,
      color: getUserColor(userId)
    };
    
    setCurrentUser(user);
    // No longer saving to localStorage - session only
    console.log('User logged in:', user);
  };

  const logout = () => {
    setCurrentUser(null);
    // No localStorage to clear - session only
    console.log('User logged out');
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
