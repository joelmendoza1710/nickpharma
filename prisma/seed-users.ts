import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const users = [
  {
    email: "admin@nickpharma.com",
    name: "Administrador NickPharma",
    password: "admin123",
    role: Role.ADMIN,
  },
  {
    email: "supervisor@nickpharma.com",
    name: "Laura Gómez",
    password: "super123",
    role: Role.SUPERVISOR,
  },
  {
    email: "cajero@nickpharma.com",
    name: "Ana Torres",
    password: "cajero123",
    role: Role.CASHIER,
  },
  {
    email: "farmaceutico@nickpharma.com",
    name: "Dr. Carlos Méndez",
    password: "farma123",
    role: Role.PHARMACIST,
  },
];

async function main() {
  console.log("👥 Creando usuarios con roles...");
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const existing = await db.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await db.user.update({
        where: { email: u.email },
        data: { name: u.name, passwordHash, role: u.role, active: true },
      });
      console.log(`  ↻ actualizado: ${u.email} (${u.role})`);
    } else {
      await db.user.create({
        data: { email: u.email, name: u.name, passwordHash, role: u.role },
      });
      console.log(`  ✓ creado: ${u.email} (${u.role})`);
    }
  }

  // Vincular ventas existentes al cajero por defecto (Ana Torres)
  const cashier = await db.user.findUnique({ where: { email: "cajero@nickpharma.com" } });
  if (cashier) {
    const updated = await db.sale.updateMany({
      where: { userId: null },
      data: { userId: cashier.id },
    });
    console.log(`🔗 ${updated.count} ventas vinculadas a ${cashier.name}`);
  }

  console.log("\n📋 Credenciales de acceso:");
  console.log("┌──────────────────────┬──────────────┬───────────┐");
  console.log("│ Email                │ Contraseña   │ Rol       │");
  console.log("├──────────────────────┼──────────────┼───────────┤");
  for (const u of users) {
    console.log(
      `│ ${u.email.padEnd(20)} │ ${u.password.padEnd(12)} │ ${u.role.padEnd(9)} │`
    );
  }
  console.log("└──────────────────────┴──────────────┴───────────┘");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
