export interface LoginRequestDTO {
  email: string;
}

export interface LoginResponseDTO {
  message: string;
}

export interface ApiErrorDTO {
  error: string;
}

export interface LoginFormData {
  email: string;
}

export interface FormErrors {
  email?: string;
  general?: string;
}
