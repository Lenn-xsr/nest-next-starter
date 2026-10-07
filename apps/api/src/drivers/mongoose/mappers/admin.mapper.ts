import { Admin } from 'src/domain/entities/admin';
import { AdminModelType } from '../models';
import { createId } from '@starter/contracts';

export class AdminMapper {
  static toDomain(doc: AdminModelType): Admin {
    return new Admin(
      createId(doc._id),
      doc.email,
      doc.name ?? null,
      doc.photo ?? null,
      doc.active ?? true,
      doc.createdAt,
      doc.updatedAt,
    );
  }
}
