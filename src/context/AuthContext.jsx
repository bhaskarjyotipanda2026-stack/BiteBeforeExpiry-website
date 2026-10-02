import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { 
  PLATFORM_ROLES, 
  ROLE_CONFIGS, 
  SEEDED_ORGANIZATIONS, 
  checkRolePermission 
} from '../services/roleService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active Role & Organization state
  const [activeRole, setActiveRole] = useState(() => {
    try {
      return localStorage.getItem('bbe_active_role') || PLATFORM_ROLES.NORMAL_USER;
    } catch {
      return PLATFORM_ROLES.NORMAL_USER;
    }
  });

  const [activeOrganization, setActiveOrganization] = useState(() => {
    return SEEDED_ORGANIZATIONS.find(o => o.role === (localStorage.getItem('bbe_active_role') || PLATFORM_ROLES.NORMAL_USER)) || SEEDED_ORGANIZATIONS[0];
  });

  // Switch role handler
  const switchRole = (newRole) => {
    if (!PLATFORM_ROLES[newRole]) return;
    setActiveRole(newRole);
    try {
      localStorage.setItem('bbe_active_role', newRole);
    } catch (e) {
      console.warn('Could not save role to localStorage', e);
    }

    const matchingOrg = SEEDED_ORGANIZATIONS.find(o => o.role === newRole) || SEEDED_ORGANIZATIONS[0];
    setActiveOrganization(matchingOrg);

    // Audit log
    dbService.logAuditAction({
      userId: user?.id || 'usr_demo_primary_001',
      orgId: matchingOrg.id,
      role: newRole,
      actionType: 'ROLE_SWITCH',
      targetEntity: 'USER_ROLE',
      details: { previousRole: activeRole, newRole, orgName: matchingOrg.name }
    });
  };

  const hasPermission = (action) => {
    return checkRolePermission(activeRole, action);
  };

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { user: currentSessionUser } = await dbService.getCurrentSession();
        if (!mounted) return;

        if (currentSessionUser) {
          setUser(currentSessionUser);
          const userProfile = await dbService.getUserProfile(currentSessionUser.id);
          if (mounted && userProfile) {
            setProfile(userProfile);
            if (userProfile.preferred_role && PLATFORM_ROLES[userProfile.preferred_role]) {
              setActiveRole(userProfile.preferred_role);
              const org = SEEDED_ORGANIZATIONS.find(o => o.role === userProfile.preferred_role);
              if (org) setActiveOrganization(org);
            }
          }
        }
      } catch (err) {
        console.error('[AuthContext] Session init failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();
    return () => { mounted = false; };
  }, []);

  // Login handler
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await dbService.login({ email, password });
      setUser(res.user);
      const userProfile = await dbService.getUserProfile(res.user.id);
      setProfile(userProfile);
      setIsAuthModalOpen(false);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  // Sign up handler
  const signUp = async (email, password, name) => {
    setAuthError(null);
    try {
      const res = await dbService.signUp({ email, password, name });
      setUser(res.user);
      const userProfile = await dbService.getUserProfile(res.user.id);
      setProfile(userProfile);
      setIsAuthModalOpen(false);
      return res.user;
    } catch (err) {
      setAuthError(err.message || 'Sign up failed');
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await dbService.logout();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('[AuthContext] Logout failed:', err);
    }
  };

  // Password reset handler
  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      return await dbService.resetPassword(email);
    } catch (err) {
      setAuthError(err.message || 'Password reset failed');
      throw err;
    }
  };

  // Update profile handler (syncs to Supabase & local DB)
  const updateProfile = async (updates) => {
    if (!user) return null;
    try {
      const updated = await dbService.upsertUserProfile(user.id, {
        ...(profile || {}),
        ...updates
      });
      setProfile(updated);
      return updated;
    } catch (err) {
      console.error('[AuthContext] Profile update failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isRoleModalOpen,
        setIsRoleModalOpen,
        activeRole,
        activeOrganization,
        roleConfig: ROLE_CONFIGS[activeRole] || ROLE_CONFIGS[PLATFORM_ROLES.NORMAL_USER],
        switchRole,
        hasPermission,
        authError,
        setAuthError,
        login,
        signUp,
        logout,
        resetPassword,
        updateProfile,
        isSupabaseConnected: dbService.isConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
