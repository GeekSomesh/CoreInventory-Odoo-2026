import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (token, user) => {
                localStorage.setItem('ci_token', token);
                set({ token, user, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem('ci_token');
                set({ token: null, user: null, isAuthenticated: false });
            },
            updateUser: (partial) => set(s => ({ user: s.user ? { ...s.user, ...partial } : null })),
        }),
        { name: 'ci-auth', partialize: s => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }
    )
);
