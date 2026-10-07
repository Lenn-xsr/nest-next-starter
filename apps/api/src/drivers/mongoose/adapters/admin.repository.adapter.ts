import {
  AdminRepositoryPort,
  CreateAdminDTO,
  UpdateAdminDTO,
} from 'src/application/ports/admin.repository.port';
import { Admin } from 'src/domain/entities/admin';
import { AdminModel } from '../models';
import { AdminMapper } from '../mappers';

export class MongooseAdminRepositoryAdapter implements AdminRepositoryPort {
  async getById(id: string): Promise<Admin | null> {
    const doc = await AdminModel.findById(id).exec();
    return doc ? AdminMapper.toDomain(doc) : null;
  }

  async getByEmail(email: string): Promise<Admin | null> {
    const doc = await AdminModel.findOne({
      email: email.trim().toLowerCase(),
    }).exec();
    return doc ? AdminMapper.toDomain(doc) : null;
  }

  async create(data: CreateAdminDTO): Promise<Admin> {
    const doc = await AdminModel.create({
      _id: data.id,
      email: data.email.trim().toLowerCase(),
      name: data.name,
      photo: data.photo ?? null,
      active: true,
    });
    return AdminMapper.toDomain(doc);
  }

  async update(id: string, data: UpdateAdminDTO): Promise<Admin> {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.photo !== undefined) update.photo = data.photo;
    if (data.active !== undefined) update.active = data.active;

    const doc = await AdminModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec();
    if (!doc) {
      throw new Error('Admin not found');
    }
    return AdminMapper.toDomain(doc);
  }

  async list(): Promise<Admin[]> {
    const docs = await AdminModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => AdminMapper.toDomain(doc));
  }
}
