export interface AuthFieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthFields(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const trimmed = email.trim();
  if (!trimmed) {
    errors.email = "Enter an email address.";
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Enter a password.";
  }
  return errors;
}

export function hasAuthFieldErrors(errors: AuthFieldErrors): boolean {
  return Boolean(errors.email || errors.password);
}
