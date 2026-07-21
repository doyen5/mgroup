import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CommercialService } from './commercial.service';
import {
  CreateClientDto,
  CreateExchangeDto,
  CreateQuoteDto,
  CreateServiceRequestDto,
  UpdateClientDto,
  UpdateQuoteDto,
  UpdateServiceRequestDto,
} from './dto/commercial.dto';

@UseGuards(JwtAuthGuard)
@Roles(RoleName.ADMIN, RoleName.COMMERCIAL, RoleName.COMPTABLE)
@Controller('commercial')
export class CommercialController {
  constructor(private readonly commercial: CommercialService) {}

  @Get('overview')
  overview() {
    // Synthese commerciale : pipeline, prospects, devis acceptes et chiffre d'affaires potentiel.
    return this.commercial.overview();
  }

  @Get('clients')
  clients() {
    // Liste enrichie des clients avec demandes, devis et historique d'echanges.
    return this.commercial.clients();
  }

  @Post('clients')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  createClient(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientDto) {
    return this.commercial.createClient(user, dto);
  }

  @Patch('clients/:clientId')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  updateClient(
    @Param('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateClientDto,
  ) {
    return this.commercial.updateClient(clientId, user, dto);
  }

  @Delete('clients/:clientId')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  removeClient(@Param('clientId') clientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commercial.removeClient(clientId, user);
  }

  @Post('requests')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  createRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    return this.commercial.createRequest(user, dto);
  }

  @Patch('requests/:requestId')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  updateRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    return this.commercial.updateRequest(requestId, user, dto);
  }

  @Delete('requests/:requestId')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  removeRequest(@Param('requestId') requestId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commercial.removeRequest(requestId, user);
  }

  @Post('quotes')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  createQuote(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQuoteDto) {
    return this.commercial.createQuote(user, dto);
  }

  @Patch('quotes/:quoteId')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  updateQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.commercial.updateQuote(quoteId, user, dto);
  }

  @Delete('quotes/:quoteId')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  removeQuote(@Param('quoteId') quoteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commercial.removeQuote(quoteId, user);
  }

  @Post('exchanges')
  @Roles(RoleName.ADMIN, RoleName.COMMERCIAL)
  createExchange(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExchangeDto) {
    return this.commercial.createExchange(user, dto);
  }
}
