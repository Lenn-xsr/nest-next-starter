import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AdminRepositoryPort } from 'src/application/ports/admin.repository.port';
import { SessionRepositoryPort } from 'src/application/ports/session.repository.port';
import { Admin } from 'src/domain/entities/admin';
import {
  allowedGoogleDomains,
  isAllowedGoogleDomain,
} from 'src/application/utils';
import { ApiError, ErrorTypes } from 'src/domain/errors';

@Injectable()
export class AdminUseCase {
  constructor(
    private readonly adminRepository: AdminRepositoryPort,
    private readonly sessionRepository: SessionRepositoryPort,
  ) {}

  getById(id: string) {
    return this.adminRepository.getById(id);
  }

  getByEmail(email: string) {
    return this.adminRepository.getByEmail(email);
  }

  list() {
    return this.adminRepository.list();
  }

  async create(data: { email: string; name?: string | null }): Promise<Admin> {
    const email = data.email.trim().toLowerCase();

    const domains = allowedGoogleDomains();
    if (domains.length === 0 || !isAllowedGoogleDomain(email, domains)) {
      throw new ApiError(ErrorTypes.ADMIN_DOMAIN_NOT_ALLOWED);
    }

    const existing = await this.adminRepository.getByEmail(email);
    if (existing) {
      throw new ApiError(ErrorTypes.ADMIN_ALREADY_EXISTS);
    }

    return this.adminRepository.create({
      id: randomUUID(),
      email,
      name: data.name ?? null,
    });
  }

  async update(
    id: string,
    data: { name?: string; photo?: string | null },
  ): Promise<Admin> {
    await this.requireAdmin(id);
    return this.adminRepository.update(id, data);
  }

  async setActive(
    id: string,
    active: boolean,
    currentAdminId: string,
  ): Promise<Admin> {
    const target = await this.requireAdmin(id);

    if (!active) {
      if (id === currentAdminId) {
        throw new ApiError(ErrorTypes.ADMIN_SELF_DEACTIVATION);
      }
      if (target.active) {
        const admins = await this.adminRepository.list();
        const activeCount = admins.filter((a) => a.active).length;
        if (activeCount <= 1) {
          throw new ApiError(ErrorTypes.ADMIN_LAST_ACTIVE);
        }
      }
    }

    const updated = await this.adminRepository.update(id, { active });

    // Deactivation is a kill-switch: drop every live session of the target
    // admin so an outstanding access/refresh token can no longer be used.
    if (!active) {
      const sessions = await this.sessionRepository.getSessionsByUserId(id);
      await Promise.all(
        sessions.map((session) =>
          this.sessionRepository.deleteSession(session.id),
        ),
      );
    }

    return updated;
  }

  private async requireAdmin(id: string): Promise<Admin> {
    const admin = await this.adminRepository.getById(id);
    if (!admin) {
      throw new ApiError(ErrorTypes.ADMIN_NOT_FOUND);
    }
    return admin;
  }
}
