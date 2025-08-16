import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface ExpiryDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const ExpiryDateInput = React.forwardRef<HTMLInputElement, ExpiryDateInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    const formatExpiryDate = (input: string) => {
      // Remove all non-numeric characters
      const numeric = input.replace(/\D/g, '');
      
      // Limit to 4 digits (MMYY)
      const limited = numeric.slice(0, 4);
      
      // Add slash after first two digits
      if (limited.length >= 2) {
        return `${limited.slice(0, 2)}/${limited.slice(2)}`;
      }
      
      return limited;
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const formatted = formatExpiryDate(e.target.value);
      setDisplayValue(formatted);
      onChange?.(formatted);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].includes(e.keyCode) ||
          // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
          // Allow home, end, left, right arrows
          (e.keyCode >= 35 && e.keyCode <= 40)) {
        return;
      }
      
      // Ensure only numbers are entered
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="MM/YY"
        maxLength={5}
        className={cn(className)}
      />
    );
  }
);

ExpiryDateInput.displayName = "ExpiryDateInput";