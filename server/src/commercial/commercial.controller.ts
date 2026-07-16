import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
  createClient(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientDto) {
    return this.commercial.createClient(user, dto);
  }

  @Patch('clients/:clientId')
  updateClient(
    @Param('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateClientDto,
  ) {
    return this.commercial.updateClient(clientId, user, dto);
  }

  @Post('requests')
  createRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    return this.commercial.createRequest(user, dto);
  }

  @Patch('requests/:requestId')
  updateRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateServiceRequestDto,
  ) {
    return this.commercial.updateRequest(requestId, user, dto);
  }

  @Post('quotes')
  createQuote(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQuoteDto) {
    return this.commercial.createQuote(user, dto);
  }

  @Patch('quotes/:quoteId')
  updateQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.commercial.updateQuote(quoteId, user, dto);
  }

  @Post('exchanges')
  createExchange(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExchangeDto) {
    return this.commercial.createExchange(user, dto);
  }
}
