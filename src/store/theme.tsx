import { createContext, useContext, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
	theme: Theme;
	toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
	theme: 'light',
	toggle: () => {
		// Default no-op, will be replaced by provider
	},
});

function getInitialTheme(): Theme {
	const stored = localStorage.getItem('kumidocs:theme');
	const theme: Theme =
		stored === 'light' || stored === 'dark'
			? stored
			: window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light';
	applyTheme(theme);
	return theme;
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
	localStorage.setItem('kumidocs:theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	const toggle = () => {
		setTheme((t) => {
			const next = t === 'dark' ? 'light' : 'dark';
			applyTheme(next);
			return next;
		});
	};

	return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	return useContext(ThemeContext);
}
