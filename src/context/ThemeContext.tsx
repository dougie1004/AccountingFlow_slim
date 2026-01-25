import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'auto';
    });

    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

    // Auto-detect theme based on time
    const getAutoTheme = (): ResolvedTheme => {
        const hour = new Date().getHours();
        // Light mode: 6 AM - 6 PM, Dark mode: 6 PM - 6 AM
        return (hour >= 6 && hour < 18) ? 'light' : 'dark';
    };

    useEffect(() => {
        const updateResolvedTheme = () => {
            const resolved = theme === 'auto' ? getAutoTheme() : theme;
            setResolvedTheme(resolved);

            // Apply to document
            if (resolved === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
            }
        };

        updateResolvedTheme();

        // Update every minute if in auto mode
        if (theme === 'auto') {
            const interval = setInterval(updateResolvedTheme, 60000);
            return () => clearInterval(interval);
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
