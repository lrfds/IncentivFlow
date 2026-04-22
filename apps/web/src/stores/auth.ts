import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONSULTOR' | 'CLIENTE' | 'AUDITOR';
  organization: {
    id: string;
    name: string;
    cnpj: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (userPatch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userPatch } : null,
        })),
    }),
    {
      name: 'incentivflow-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);