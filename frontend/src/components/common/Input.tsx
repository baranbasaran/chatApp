import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={`
            block w-full rounded-md border-gray-300 shadow-sm
            focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600" id={`${id}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
); 