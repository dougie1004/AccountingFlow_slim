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
    // Only Dark mode is supported now.
    const [theme, setTheme] = useState<Theme>('dark');
    const resolvedTheme: ResolvedTheme = 'dark';

    useEffect(() => {
        // Force dark class on document 
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('theme', 'dark'); // Override any previous settings
    }, []);

    // Also override any calls to setTheme
    const enforceSetTheme = (_val: Theme) => {
        setTheme('dark');
    };

    return (
        <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme: enforceSetTheme }}>
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
