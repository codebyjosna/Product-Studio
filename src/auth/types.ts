export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
}

export interface PendingSignup {
  name: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
}

export interface PendingReset {
  email: string;
  otp: string;
  expiresAt: number;
  otpVerified?: boolean;
}
