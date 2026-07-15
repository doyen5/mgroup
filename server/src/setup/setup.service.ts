import { ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, RoleName, UserStatus } from '@prisma/client';
import { DEFAULT_ROLES } from '../common/roles';
import { PasswordService } from '../common/security/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyAdminSetupDto } from './dto/company-admin-setup.dto';

@Injectable()
export class SetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async status() {
    const [companyCount, adminCount] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count({
        where: {
          roles: {
            some: {
              role: { name: RoleName.ADMIN },
            },
          },
        },
      }),
    ]);

    return {
      requiresSetup: companyCount === 0 || adminCount === 0,
      companyCount,
      adminCount,
    };
  }

  async createCompanyAndAdmin(dto: CompanyAdminSetupDto) {
    const setupStatus = await this.status();

    if (!setupStatus.requiresSetup) {
      throw new ConflictException('Initial setup has already been completed.');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const role of DEFAULT_ROLES) {
        await tx.role.upsert({
          where: { name: role.name },
          update: {
            label: role.label,
            description: role.description,
          },
          create: role,
        });
      }

      const adminRole = await tx.role.findUniqueOrThrow({
        where: { name: RoleName.ADMIN },
      });
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          legalName: dto.legalName,
          address: dto.companyAddress,
          email: dto.companyEmail.toLowerCase().trim(),
          phone: dto.companyPhone,
          photoUrl: dto.companyPhotoUrl,
        },
      });
      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          address: dto.adminAddress,
          email: dto.adminEmail.toLowerCase().trim(),
          phone: dto.adminPhone,
          photoUrl: dto.adminPhotoUrl,
          passwordHash: await this.passwords.hash(dto.adminPassword),
          status: UserStatus.FORCE_PASSWORD_CHANGE,
          roles: {
            create: {
              roleId: adminRole.id,
            },
          },
        },
        include: {
          roles: { include: { role: true } },
        },
      });

      await tx.loginAuditLog.create({
        data: {
          userId: admin.id,
          action: AuditAction.SETUP_COMPLETED,
        },
      });

      return {
        company,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          status: admin.status,
          roles: admin.roles.map(({ role }) => ({
            name: role.name,
            label: role.label,
          })),
        },
      };
    });
  }
}
