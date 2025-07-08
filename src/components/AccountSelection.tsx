import { Button } from '@/components/ui/button';
import { X, Users, Shield, User } from 'lucide-react';

interface AccountSelectionProps {
  onLogin: (userType: 'admin' | 'housekeeper', userId: string) => void;
  onClose: () => void;
}

export const AccountSelection = ({ onLogin, onClose }: AccountSelectionProps) => {
  const housekeepingAccounts = [
    { id: 'HK1', name: 'HK1', color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'HK2', name: 'HK2', color: 'bg-green-500 hover:bg-green-600' },
    { id: 'HK3', name: 'HK3', color: 'bg-purple-500 hover:bg-purple-600' },
    { id: 'HK4', name: 'HK4', color: 'bg-orange-500 hover:bg-orange-600' }
  ];

  const handleAccountSelect = (userType: 'admin' | 'housekeeper', userId: string) => {
    onLogin(userType, userId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Select Account</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Admin Account */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Administrator
            </h3>
            <Button
              onClick={() => handleAccountSelect('admin', 'Admin')}
              className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Shield className="w-5 h-5 mr-2" />
              Admin Account
            </Button>
          </div>

          {/* Housekeeping Accounts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Housekeeping Staff
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {housekeepingAccounts.map((account) => (
                <Button
                  key={account.id}
                  onClick={() => handleAccountSelect('housekeeper', account.id)}
                  className={`h-16 text-lg font-semibold text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${account.color}`}
                >
                  <User className="w-5 h-5 mr-2" />
                  {account.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Account Types:</p>
          <p>• <strong>Admin:</strong> Full system access, task management, resets</p>
          <p>• <strong>HK1-4:</strong> Room status updates, task completion, messaging</p>
        </div>
      </div>
    </div>
  );
};
