import { api } from './client';
import type { LoginRequestDTO, LoginResponseDTO } from '@/types/auth';

/**
 * Initiates the login process using magic link
 * @param data - Login request data (email)
 * @returns Response indicating success/failure
 */
export const login = async (data: LoginRequestDTO): Promise<LoginResponseDTO> => {
  const response = await api.post<LoginResponseDTO>('/api/auth/login', data);
  return response.data;
};
