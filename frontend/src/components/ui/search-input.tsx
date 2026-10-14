import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ICON_SIZE_SM, SEARCH_DEBOUNCE_MS } from "@/lib/config/constants";

/**
 * Props for the SearchInput component.
 */
export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  /** External or initial search value */
  value?: string;
  /** Callback invoked when the search value changes after debounce */
  onSearchChange: (value: string) => void;
  /** Debounce delay in milliseconds (defaults to SEARCH_DEBOUNCE_MS = 300) */
  debounceMs?: number;
  /** Whether to show clear button when input has value (defaults to true) */
  showClear?: boolean;
  /** Additional styling class names for the outer wrapper container */
  containerClassName?: string;
}

/**
 * Reusable debounced search input component with search icon and clear button.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value: externalValue = "",
      onSearchChange,
      debounceMs = SEARCH_DEBOUNCE_MS,
      showClear = true,
      containerClassName,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [searchValue, setSearchValue] = React.useState(externalValue);
    const isFirstMount = React.useRef(true);

    // Sync external value changes (e.g. filter reset)
    React.useEffect(() => {
      setSearchValue(externalValue);
    }, [externalValue]);

    // Debounce callback invocation
    React.useEffect(() => {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }

      if (searchValue === externalValue) {
        return;
      }

      const timer = setTimeout(() => {
        onSearchChange(searchValue);
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [searchValue, externalValue, onSearchChange, debounceMs]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
    };

    const handleClear = () => {
      setSearchValue("");
      if (externalValue !== "") {
        onSearchChange("");
      }
    };

    return (
      <div className={cn("relative flex items-center w-full", containerClassName)}>
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            ICON_SIZE_SM
          )}
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="text"
          value={searchValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn("pl-9", showClear && searchValue && "pr-9", className)}
          {...props}
        />
        {showClear && searchValue && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Wyczyść pole wyszukiwania"
          >
            <X className={ICON_SIZE_SM} />
          </Button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
