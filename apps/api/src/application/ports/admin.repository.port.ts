import { Admin } from 'src/domain/entities/admin';

export interface CreateAdminDTO {
  id: string;
  email: string;
  name: string | null;
  photo?: string | null;
}

export interface UpdateAdminDTO {
  name?: string | null;
  photo?: string | null;
  active?: boolean;
}

export abstract class AdminRepositoryPort {
  abstract getById(id: string): Promise<Admin | null>;
  abstract getByEmail(email: string): Promise<Admin | null>;
  abstract create(data: CreateAdminDTO): Promise<Admin>;
  abstract update(id: string, data: UpdateAdminDTO): Promise<Admin>;
  abstract list(): Promise<Admin[]>;
}
