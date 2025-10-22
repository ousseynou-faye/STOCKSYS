import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async company() {
    const s = await this.prisma.setting.findFirst({ where: { key: 'companyInfo', storeId: null } });
    return s?.value ?? { name: '', logoUrl: '', address: '', taxNumber: '' };
  }
  async updateCompany(data: any) {
    const s = await this.prisma.setting.findFirst({ where: { key: 'companyInfo', storeId: null } });
    if (s) {
      await this.prisma.setting.update({ where: { id: s.id }, data: { value: data } });
    } else {
      await this.prisma.setting.create({ data: { key: 'companyInfo', value: data } });
    }
    return { success: true };
  }

  async app() {
    const s = await this.prisma.setting.findFirst({ where: { key: 'appSettings', storeId: null } });
    return s?.value ?? { stockAlertThreshold: 10 };
  }
  async updateApp(data: any) {
    const s = await this.prisma.setting.findFirst({ where: { key: 'appSettings', storeId: null } });
    if (s) {
      await this.prisma.setting.update({ where: { id: s.id }, data: { value: data } });
    } else {
      await this.prisma.setting.create({ data: { key: 'appSettings', value: data } });
    }
    return { success: true };
  }
}
