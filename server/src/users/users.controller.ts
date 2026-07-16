import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ApproveUserDto } from './dto/approve-user.dto';
import { UpdateInterfacePreferenceDto } from './dto/interface-preference.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.me(user);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(user, dto);
  }

  @Get('me/preferences')
  getInterfacePreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getInterfacePreferences(user);
  }

  @Patch('me/preferences')
  updateInterfacePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateInterfacePreferenceDto,
  ) {
    return this.users.updateInterfacePreferences(user, dto);
  }

  @Roles(RoleName.ADMIN)
  @Get()
  list() {
    return this.users.list();
  }

  @Roles(RoleName.ADMIN)
  @Get('pending')
  pending() {
    return this.users.pending();
  }

  @Roles(RoleName.ADMIN)
  @Get('activity')
  activity() {
    return this.users.activity();
  }

  @Roles(RoleName.ADMIN)
  @Get(':id/history')
  history(@Param('id') userId: string) {
    return this.users.history(userId);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/approve')
  approve(
    @Param('id') userId: string,
    @Body() dto: ApproveUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.users.approve(userId, dto, admin);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/role')
  updateRole(
    @Param('id') userId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.users.updateRole(userId, dto, admin);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/disable')
  disable(@Param('id') userId: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.users.disable(userId, admin);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/reactivate')
  reactivate(@Param('id') userId: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.users.reactivate(userId, admin);
  }

  @Roles(RoleName.ADMIN)
  @Post(':id/reset-password')
  resetPassword(
    @Param('id') userId: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.users.resetPassword(userId, dto, admin);
  }
}
