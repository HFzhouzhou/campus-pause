import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue {
  user: UserProfile | null;
  authModalOpen: boolean;
  authPromptReason: string;
  profileModalOpen: boolean;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  /**
   * 小红书式非强制登录拦截器：
   * - 已登录：直接执行 action()
   * - 未登录：弹出 iOS 邮箱登录 Sheet，并在登录成功后自动继续执行刚刚想做的操作！
   */
  requireAuth: (reason: string, action: () => void) => void;
  onLoginSuccess: (profile: UserProfile) => void;
  updateUserProfile: (
    patch: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl' | 'schoolName'>>
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(() =>
    authService.getCurrentUser()
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const pendingActionRef = useRef<(() => void) | null>(null);

  const openAuthModal = useCallback((reason = '') => {
    setAuthPromptReason(reason);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    pendingActionRef.current = null;
  }, []);

  const openProfileModal = useCallback(() => setProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setProfileModalOpen(false), []);

  const requireAuth = useCallback(
    (reason: string, action: () => void) => {
      if (user) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setAuthPromptReason(reason);
      setAuthModalOpen(true);
    },
    [user]
  );

  const onLoginSuccess = useCallback((profile: UserProfile) => {
    setUser(profile);
    setAuthModalOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) {
      window.setTimeout(() => pending(), 160);
    }
  }, []);

  const updateUserProfile = useCallback(
    (patch: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl' | 'schoolName'>>) => {
      const updated = authService.updateProfile(patch);
      if (updated) setUser(updated);
    },
    []
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setProfileModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authModalOpen,
        authPromptReason,
        profileModalOpen,
        openAuthModal,
        closeAuthModal,
        openProfileModal,
        closeProfileModal,
        requireAuth,
        onLoginSuccess,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
