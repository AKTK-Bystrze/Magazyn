import { api } from './client';
import type { LoginRequestDTO, LoginResponseDTO } from '@/types/auth';

export const login = async (data: LoginRequestDTO): Promise<LoginResponseDTO> => {
  const response = await api.post<LoginResponseDTO>('/auth/login', data);
  return response.data;
};
