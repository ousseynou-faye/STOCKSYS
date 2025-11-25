import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
<<<<<<< HEAD
=======
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
>>>>>>> 7884868 (STOCKSYS)
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt.guard.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
<<<<<<< HEAD
=======
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 60) // 5 attempts per 60s per IP
>>>>>>> 7884868 (STOCKSYS)
  @ApiBody({
    schema: {
      type: 'object',
      properties: { username: { type: 'string' }, password: { type: 'string' } },
      required: ['username', 'password']
    },
    examples: { admin: { value: { username: 'admin', password: 'password123' } } }
  })
  @ApiOkResponse({ description: 'JWT + utilisateur', schema: { example: { data: { token: 'xxx.yyy.zzz', user: { id: 'user_admin', username: 'admin', roleIds: ['role_admin'], storeId: null } } } } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  async profile(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPass, dto.newPass);
  }
}
