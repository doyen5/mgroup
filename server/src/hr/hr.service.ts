import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  StaffAvailability,
  StaffContractStatus,
  StaffContractType,
  StaffDocumentType,
  StaffMissionStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStaffContractDto,
  CreateStaffDocumentDto,
  CreateStaffMissionDto,
  UpsertStaffProfileDto,
} from './dto/hr.dto';

const staffInclude = {
  roles: { include: { role: true } },
  staffProfile: true,
  staffContracts: { orderBy: { createdAt: 'desc' as const } },
  staffDocuments: { orderBy: { createdAt: 'desc' as const } },
  staffMissions: {
    include: {
      event: {
        select: { id: true, title: true, startsAt: true, location: true, status: true },
      },
    },
    orderBy: { startsAt: 'desc' as const },
  },
  eventAssignments: {
    include: {
      event: {
        select: { id: true, title: true, startsAt: true, location: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const staff = await this.getStaffUsers();
    const now = new Date();

    return {
      totals: {
        personnel: staff.length,
        available: staff.filter((user) => user.staffProfile?.availability === StaffAvailability.AVAILABLE).length,
        contractsActive: staff.reduce(
          (total, user) =>
            total + user.staffContracts.filter((contract) => contract.status === StaffContractStatus.ACTIVE).length,
          0,
        ),
        missionsUpcoming: staff.reduce(
          (total, user) =>
            total +
            user.staffMissions.filter(
              (mission) =>
                mission.status !== StaffMissionStatus.CANCELLED &&
                (!mission.startsAt || mission.startsAt >= now),
            ).length,
          0,
        ),
      },
      staff: staff.map((user) => this.toStaffUser(user)),
    };
  }

  async staff() {
    const staff = await this.getStaffUsers();
    return staff.map((user) => this.toStaffUser(user));
  }

  async upsertProfile(userId: string, dto: UpsertStaffProfileDto, actor: AuthenticatedUser) {
    await this.ensureUserExists(userId);

    const profile = await this.prisma.staffProfile.upsert({
      where: { userId },
      update: {
        internalRole: this.clean(dto.internalRole),
        department: this.clean(dto.department),
        availability: dto.availability,
        availabilityNotes: this.clean(dto.availabilityNotes),
        emergencyContact: this.clean(dto.emergencyContact),
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      create: {
        userId,
        internalRole: this.clean(dto.internalRole),
        department: this.clean(dto.department),
        availability: dto.availability ?? StaffAvailability.AVAILABLE,
        availabilityNotes: this.clean(dto.availabilityNotes),
        emergencyContact: this.clean(dto.emergencyContact),
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
    });

    await this.audit(actor, AuditAction.STAFF_PROFILE_UPDATED, { staffUserId: userId });
    return profile;
  }

  async createContract(userId: string, dto: CreateStaffContractDto, actor: AuthenticatedUser) {
    await this.ensureUserExists(userId);

    const contract = await this.prisma.staffContract.create({
      data: {
        userId,
        title: dto.title.trim(),
        type: dto.type ?? StaffContractType.AUTRE,
        status: dto.status ?? StaffContractStatus.ACTIVE,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        salaryFcfa: dto.salaryFcfa,
        fileUrl: this.clean(dto.fileUrl),
        notes: this.clean(dto.notes),
      },
    });

    await this.audit(actor, AuditAction.STAFF_CONTRACT_CREATED, {
      staffUserId: userId,
      contractId: contract.id,
    });
    return contract;
  }

  async createDocument(userId: string, dto: CreateStaffDocumentDto, actor: AuthenticatedUser) {
    await this.ensureUserExists(userId);

    const document = await this.prisma.staffDocument.create({
      data: {
        userId,
        label: dto.label.trim(),
        type: dto.type ?? StaffDocumentType.OTHER,
        url: dto.url,
        fileName: this.clean(dto.fileName),
        mimeType: this.clean(dto.mimeType),
      },
    });

    await this.audit(actor, AuditAction.STAFF_DOCUMENT_CREATED, {
      staffUserId: userId,
      documentId: document.id,
    });
    return document;
  }

  async createMission(userId: string, dto: CreateStaffMissionDto, actor: AuthenticatedUser) {
    await this.ensureUserExists(userId);

    if (dto.eventId) {
      await this.ensureEventExists(dto.eventId);
    }

    const mission = await this.prisma.staffMission.create({
      data: {
        userId,
        eventId: this.clean(dto.eventId),
        title: dto.title.trim(),
        roleNote: this.clean(dto.roleNote),
        status: dto.status ?? StaffMissionStatus.PLANNED,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        notes: this.clean(dto.notes),
      },
    });

    await this.audit(actor, AuditAction.STAFF_MISSION_CREATED, {
      staffUserId: userId,
      missionId: mission.id,
      eventId: dto.eventId,
    });
    return mission;
  }

  private async getStaffUsers() {
    return this.prisma.user.findMany({
      where: { status: { not: UserStatus.DISABLED } },
      include: staffInclude,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  private async ensureUserExists(userId: string) {
    const count = await this.prisma.user.count({ where: { id: userId } });

    if (count === 0) {
      throw new NotFoundException('Staff user not found.');
    }
  }

  private async ensureEventExists(eventId: string) {
    const count = await this.prisma.event.count({ where: { id: eventId } });

    if (count === 0) {
      throw new NotFoundException('Event not found.');
    }
  }

  private async audit(actor: AuthenticatedUser, action: AuditAction, metadata: Prisma.InputJsonObject) {
    await this.prisma.loginAuditLog.create({
      data: {
        userId: actor.sub,
        action,
        metadata,
      },
    });
  }

  private clean(value?: string) {
    return value === undefined ? undefined : value.trim();
  }

  private toStaffUser(user: Awaited<ReturnType<HrService['getStaffUsers']>>[number]) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      status: user.status,
      roles: user.roles.map(({ role }) => ({
        name: role.name,
        label: role.label,
      })),
      profile: user.staffProfile,
      contracts: user.staffContracts,
      documents: user.staffDocuments,
      missions: user.staffMissions,
      eventAssignments: user.eventAssignments,
    };
  }
}
