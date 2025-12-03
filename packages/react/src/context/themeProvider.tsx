import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { ToastContextType } from './toasts';

export interface ThemeContextType {
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

type ThemeProviderProps = {
    children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Placeholder for future theme-related state and functions
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
    useEffect(() => {
        const theme = localStorage.getItem('admin-theme') as 'light' | 'dark' | 'auto' | null;
        if (theme) {
            setTheme(theme);
        }
    }, []);
    useEffect(() => {
        const topElement = document.documentElement;
        // const topElement = document.body;
        if (theme === 'light') {
            topElement.classList.remove('admin-theme-dark');
            topElement.classList.add('admin-theme-light');
        } else if (theme === 'dark') {
            topElement.classList.add('admin-theme-dark');
            topElement.classList.remove('admin-theme-light');
        } else {
            topElement.classList.remove('admin-theme-light');
            topElement.classList.remove('admin-theme-dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{}}>
            <div className="admin-flex admin-justify-end admin-p-4">
                <div className="theme-switcher admin-m-4 admin-text-sm admin-font-medium admin-flex admin-items-center">
                    <select
                        value={theme}
                        onChange={(e) => {
                            const selectedTheme = e.target.value as 'light' | 'dark' | 'auto';
                            setTheme(selectedTheme);
                            localStorage.setItem('admin-theme', selectedTheme);
                        }}
                        className="admin-m-2 admin-px-2 admin-py-1 admin-border admin-border-gray-300 admin-rounded admin-focus-visible:outline-none focus:admin-ring-2 focus:admin-ring-blue-500"
                    >
                        <option value="auto">Auto</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
            </div>
            {children}
        </ThemeContext.Provider>
    );
};