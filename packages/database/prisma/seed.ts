import { AdminRole, Currency, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function seedOwnerAdmin() {
  const username = process.env.ADMIN_USERNAME ?? "owner";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("ADMIN_PASSWORD is required to seed the owner account");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash, role: AdminRole.OWNER, isActive: true },
    create: {
      username,
      email: process.env.ADMIN_EMAIL ?? null,
      passwordHash,
      displayName: process.env.ADMIN_DISPLAY_NAME ?? "HMRAY Owner",
      role: AdminRole.OWNER,
      isActive: true,
    },
  });

  console.log(`✔ owner admin: ${admin.username}`);
  return admin;
}

async function seedPaymentMethods() {
  const methods = [
    {
      title: "کارت به کارت",
      description: "واریز مستقیم به کارت بانکی",
      accountOrWallet: "0000-0000-0000-0000",
      network: null,
      instructions: "پس از واریز، تصویر رسید را ارسال کنید.",
      sortOrder: 1,
    },
    {
      title: "تتر (USDT - TRC20)",
      description: "پرداخت با تتر روی شبکه ترون",
      accountOrWallet: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      network: "TRC20",
      instructions: "فقط شبکه TRC20. پس از انتقال، هش تراکنش را ارسال کنید.",
      sortOrder: 2,
    },
  ];

  for (const method of methods) {
    const existing = await prisma.paymentMethod.findFirst({ where: { title: method.title } });
    if (existing) {
      await prisma.paymentMethod.update({ where: { id: existing.id }, data: method });
    } else {
      await prisma.paymentMethod.create({ data: { ...method, enabled: true } });
    }
  }

  console.log(`✔ payment methods: ${methods.length}`);
}

async function seedSettings() {
  const settings: Array<{ key: string; value: unknown }> = [
    { key: "quoteValidityDays", value: 3 },
    { key: "defaultInspectionType", value: "FULL_OPEN" },
    { key: "temuBatchTargetOmr", value: 100 },
    { key: "botMaintenanceMode", value: false },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as never },
      create: { key: setting.key, value: setting.value as never },
    });
  }

  console.log(`✔ settings: ${settings.map((s) => s.key).join(", ")}`);
}

async function seedExchangeRate(adminId: string) {
  const existing = await prisma.exchangeRate.findFirst({
    where: { currency: Currency.OMR },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    console.log(`✔ OMR rate already present: ${existing.rateToToman.toString()}`);
    return;
  }

  const rate = await prisma.exchangeRate.create({
    data: {
      currency: Currency.OMR,
      rateToToman: "165000",
      setByAdminId: adminId,
      note: "Seed sample rate — update before going live",
    },
  });

  console.log(`✔ OMR rate: ${rate.rateToToman.toString()} toman`);
}

async function main() {
  const admin = await seedOwnerAdmin();
  await seedPaymentMethods();
  await seedSettings();
  await seedExchangeRate(admin.id);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
