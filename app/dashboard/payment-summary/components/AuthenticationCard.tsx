"use client";
import React from "react";
import { mdiEye, mdiEyeOff, mdiLock } from "@mdi/js";
import Icon from "../../../_components/Icon";
import FormField from "../../../_components/FormField";
import CardBox from "../../../_components/CardBox";

interface AuthenticationCardProps {
  password: string;
  showPassword: boolean;
  isAuthenticating: boolean;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  handleAuthentication: () => void;
}

const AuthenticationCard: React.FC<AuthenticationCardProps> = ({
  password,
  showPassword,
  isAuthenticating,
  setPassword,
  setShowPassword,
  handleAuthentication
}) => {
  return (
    <div className="max-w-md mx-auto">
      <CardBox className="backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 shadow-2xl border-0">
        <div className="text-center py-12 px-8">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Icon path={mdiLock} className="text-white" size={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Secure Access Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            Enter your finance password to unlock powerful analytics
          </p>
          
          <div className="space-y-6">
            <FormField>
              {() => (
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter finance password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuthentication()}
                    className="w-full pr-14 pl-6 py-4 border-2 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-300 text-lg placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <Icon path={showPassword ? mdiEyeOff : mdiEye} size={1.2} />
                  </button>
                </div>
              )}
            </FormField>
            
            <button
              onClick={handleAuthentication}
              disabled={isAuthenticating || !password.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 transition-all duration-300 text-lg"
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Icon path={mdiLock} size={1.1} />
                  <span>Unlock Dashboard</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </CardBox>
    </div>
  );
};

export default AuthenticationCard;
