import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="icon-btn"
        aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-10 w-full items-center gap-3 rounded-xl border border-line/70 bg-panel/70 px-3 text-sm font-medium text-muted transition hover:border-primary/40 hover:text-main"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
      <span className="flex-1 text-left">{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
      <span className="flex h-5 w-9 items-center rounded-full bg-line p-0.5">
        <motion.span
          animate={{ x: theme === 'dark' ? 14 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="h-4 w-4 rounded-full bg-primary"
        />
      </span>
    </button>
  );
}
