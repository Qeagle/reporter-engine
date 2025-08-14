import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, Check } from 'lucide-react';
import profileService, { PasswordChangeData } from '../../services/profileService';

interface PasswordChangeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleInputChange = (field: keyof PasswordChangeData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    setError(null);
    setValidationErrors([]);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const errors = profileService.validatePasswordData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setValidationErrors([]);
      
      await profileService.changePassword(formData);
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to change password';
      setError(errorMessage);
      console.error('Error changing password:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const criteria = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ];
    
    strength = criteria.filter(Boolean).length;
    
    if (strength <= 1) return { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-600' };
    if (strength <= 2) return { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-600' };
    if (strength <= 3) return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (strength <= 4) return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Lock className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Password strength:</span>
                  <span className={`font-medium ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${passwordStrength.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${(getPasswordStrength(formData.newPassword).label === 'Very Weak' ? 20 : 
                      getPasswordStrength(formData.newPassword).label === 'Weak' ? 40 :
                      getPasswordStrength(formData.newPassword).label === 'Fair' ? 60 :
                      getPasswordStrength(formData.newPassword).label === 'Good' ? 80 : 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="mt-1 flex items-center text-xs">
                {formData.newPassword === formData.confirmPassword ? (
                  <>
                    <Check className="w-3 h-3 text-green-500 mr-1" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 text-red-500 mr-1" />
                    <span className="text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${formData.newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
                At least 6 characters long
              </li>
              <li className="flex items-center">
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/[a-z]/.test(formData.newPassword) && /[A-Z]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                Mix of uppercase and lowercase letters
              </li>
              <li className="flex items-center">
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${/\d/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                At least one number
              </li>
            </ul>
          </div>

          {/* Error Messages */}
          {(error || validationErrors.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  {error && <p>{error}</p>}
                  {validationErrors.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {validationErrors.map((err, index) => (
                        <li key={index}>• {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || validationErrors.length > 0 || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
