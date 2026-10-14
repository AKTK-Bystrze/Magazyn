import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  /** Additional styling class names for the outer wrapper container */
  containerClassName?: string;
}

/**
 * Reusable debounced search input component with search icon.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value: externalValue = "",
      onSearchChange,
      containerClassName,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [searchValue, setSearchValue] = React.useState(externalValue);

    React.useEffect(() => {
      setSearchValue(externalValue);
    }, [externalValue]);

    React.useEffect(() => {
      if (searchValue === externalValue) return;

      const timer = setTimeout(() => {
        onSearchChange(searchValue);
      }, SEARCH_DEBOUNCE_MS);

      return () => clearTimeout(timer);
    }, [searchValue, externalValue, onSearchChange]);

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
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          disabled={disabled}
          className={cn("pl-9", className)}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
