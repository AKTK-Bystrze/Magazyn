/**
 * ThemeToggle Component
 * 
 * Button to toggle between dark and light modes.
 * Uses Sun/Moon icons from lucide-react.
 * 
 * @example
 * <ThemeToggle />
 */
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';

/**
 * Toggle button for switching between dark and light themes
 */
export function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
      className="h-9 w-9"
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
