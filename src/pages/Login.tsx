import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Shield, User } from 'lucide-react';
import { useUser } from '@/hooks/useUserContext';

const Login = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useUser();

  const housekeepingAccounts = [
    { id: 'HK1', name: 'HK1', color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'HK2', name: 'HK2', color: 'bg-green-500 hover:bg-green-600' },
    { id: 'HK3', name: 'HK3', color: 'bg-purple-500 hover:bg-purple-600' },
    { id: 'HK4', name: 'HK4', color: 'bg-orange-500 hover:bg-orange-600' }
  ];

  const handleHousekeepingLogin = (userId: string) => {
    login('housekeeper', userId);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple authentication - in real app, this would be more secure
    if (username === 'admin' && password === 'hotel123') {
      login('admin', 'Admin');
      setError('');
    } else {
      setError('Invalid credentials. Try admin/hotel123');
    }
  };

  const handleBackToSelection = () => {
    setShowAdminLogin(false);
    setUsername('');
    setPassword('');
    setError('');
  };

  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-soft border border-white/20">
          <div className="text-center mb-8">
            <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Login</h1>
            <p className="text-gray-600">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              Demo credentials: admin / hotel123
            </div>

            <div className="space-y-3">
              <Button type="submit" className="w-full h-12 text-lg font-semibold">
                Login as Admin
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBackToSelection}
                className="w-full h-12 text-lg"
              >
                Back to Account Selection
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-soft border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Hotel Housekeeping
          </h1>
          <p className="text-lg text-gray-600 mb-2">Select Account</p>
          <p className="text-sm text-gray-500">Choose your account to get started</p>
        </div>

        <div className="space-y-8">
          {/* Admin Account */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Administrator
            </h3>
            <Button
              onClick={() => setShowAdminLogin(true)}
              className="w-full h-16 text-xl font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Shield className="w-6 h-6 mr-3" />
              Admin Account
            </Button>
          </div>

          {/* Housekeeping Accounts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Housekeeping Staff
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {housekeepingAccounts.map((account) => (
                <Button
                  key={account.id}
                  onClick={() => handleHousekeepingLogin(account.id)}
                  className={`h-16 text-xl font-semibold text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${account.color}`}
                >
                  <User className="w-6 h-6 mr-3" />
                  {account.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-500 bg-gray-50 p-4 rounded-xl">
          <p className="font-medium mb-2">Account Types:</p>
          <p className="mb-1">• <strong>Admin:</strong> Full system access, task management, resets</p>
          <p>• <strong>HK1-4:</strong> Room status updates, task completion, messaging</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
