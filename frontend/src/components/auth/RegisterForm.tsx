import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateName,
  validateConfirmPassword,
} from '../../utils/validation';

export function RegisterForm() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    if (formData.firstName) {
      const firstNameError = validateName(formData.firstName, 'First name');
      if (firstNameError) newErrors.firstName = firstNameError;
    }

    if (formData.lastName) {
      const lastNameError = validateName(formData.lastName, 'Last name');
      if (lastNameError) newErrors.lastName = lastNameError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      // Redirect will be handled by the router
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Registration failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.form && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {errors.form}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              label="Email address"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />

            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              label="Username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                label="First name"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
              />

              <Input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                label="Last name"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
              />
            </div>

            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              label="Password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              label="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
            />
          </div>

          <div>
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              Create account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 