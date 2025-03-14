export interface ValidationError {
  [key: string]: string;
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required';
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

export function validateName(name: string, field: string): string | null {
  if (!name) {
    return `${field} is required`;
  }
  if (name.length < 2) {
    return `${field} must be at least 2 characters long`;
  }
  if (!/^[a-zA-Z\s-]+$/.test(name)) {
    return `${field} can only contain letters, spaces, and hyphens`;
  }
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
} 