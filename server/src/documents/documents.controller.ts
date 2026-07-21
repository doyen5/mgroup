import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { DocumentsService } from './documents.service';
import {
  CreateBusinessDocumentDto,
  GenerateBusinessDocumentDto,
  UpdateBusinessDocumentDto,
  ValidateBusinessDocumentDto,
} from './dto/document.dto';

@UseGuards(JwtAuthGuard)
@Roles(RoleName.ADMIN, RoleName.RH, RoleName.COMPTABLE, RoleName.COMMERCIAL)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('overview')
  overview() {
    // Vue documentaire transversale : fichiers par cible, validations et documents archives.
    return this.documents.overview();
  }

  @Get()
  list() {
    return this.documents.list();
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBusinessDocumentDto) {
    return this.documents.create(user, dto);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateBusinessDocumentDto) {
    return this.documents.generate(user, dto);
  }

  @Patch(':documentId')
  update(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBusinessDocumentDto,
  ) {
    return this.documents.update(documentId, user, dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':documentId/validate')
  validate(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidateBusinessDocumentDto,
  ) {
    return this.documents.validate(documentId, user, dto);
  }

  @Delete(':documentId')
  remove(@Param('documentId') documentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.remove(documentId, user);
  }
}
