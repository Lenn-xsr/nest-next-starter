import { AdminResponse } from '@starter/contracts';
import { Admin } from 'src/domain/entities/admin';

export class AdminMapper {
  static toHttpResponse(admin: Admin): AdminResponse {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      photo: admin.photo,
      active: admin.active,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    };
  }
}
