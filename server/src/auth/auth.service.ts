import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(username: string, password: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { username }, include: { roles: true } });
      if (!user) throw new UnauthorizedException("Nom d'utilisateur ou mot de passe invalide.");

      const ok = await bcrypt.compare(password, user.passwordHash).catch(() => false);
      if (!ok) throw new UnauthorizedException("Nom d'utilisateur ou mot de passe invalide.");

      const roles = Array.isArray(user.roles) ? user.roles : [];
      const permissions = new Set<string>();
      roles.forEach((r: any) => (r?.permissions || []).forEach((p: string) => permissions.add(p)));

      const payload = { sub: user.id, username: user.username, storeId: user.storeId, permissions: Array.from(permissions) };
      const token = await this.jwt.signAsync(payload);
      return {
        token,
        permissions: Array.from(permissions),
        user: { id: user.id, username: user.username, roleIds: roles.map((r: any) => r.id), storeId: user.storeId, profilePictureUrl: user.profilePictureUrl },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Nom d'utilisateur ou mot de passe invalide.");
    }
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(currentPass, user.passwordHash).catch(() => false);
    if (!ok) throw new UnauthorizedException('Mot de passe actuel incorrect.');
    const hash = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { success: true, message: 'Mot de passe mis à jour avec succès.' };
  }
}
