import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("🏭 Creando proveedores...");

  const suppliers = [
    { name: "Distribuidora Farmacéutica Central", contactName: "Juan Pérez", phone: "+57 601 555 1234", email: "ventas@distcentral.com", address: "Cra 30 #40-15, Bogotá", taxId: "900.654.321-2", active: true, notes: "Distribuidor principal de medicamentos genéricos" },
    { name: "Tecnoquímicas S.A.", contactName: "María González", phone: "+57 602 888 4567", email: "pedidos@tecnoquimicas.com", address: "Calle 25 #50-80, Cali", taxId: "890.300.121-6", active: true, notes: "Laboratorio nacional" },
    { name: "Bayer Colombia", contactName: "Carlos Ruiz", phone: "+57 601 753 9876", email: "ventas@bayer.co", address: "Av. El Dorado #100-20, Bogotá", taxId: "830.002.344-1", active: true },
    { name: "Pfizer Laboratories", contactName: "Ana Martínez", phone: "+1 212 733 2323", email: "orders@pfizer.com", address: "235 East 42nd Street, NYC", taxId: "N/A", active: true },
    { name: "Vitalis S.A.", contactName: "Pedro Santos", phone: "+57 601 444 2211", email: "comercial@vitalis.com", address: "Calle 80 #15-30, Bogotá", taxId: "830.115.889-4", active: true, notes: "Vitaminas y suplementos" },
  ];

  const createdSuppliers: any[] = [];
  for (const s of suppliers) {
    const existing = await db.supplier.findUnique({ where: { name: s.name } });
    if (!existing) {
      const created = await db.supplier.create({ data: s });
      createdSuppliers.push(created);
      console.log(`  ✅ ${created.name}`);
    } else {
      createdSuppliers.push(existing);
      console.log(`  ⏭️  ${existing.name} (ya existe)`);
    }
  }

  console.log("📦 Creando órdenes de compra...");

  // Obtener productos existentes
  const products = await db.product.findMany({ select: { id: true, name: true, costPrice: true } });
  if (products.length === 0) {
    console.log("⚠️  No hay productos. Ejecuta primero prisma/seed.ts");
    return;
  }

  const userId = (await db.user.findFirst({ where: { role: "ADMIN" } }))?.id;

  // Crear 8 órdenes de compra
  const orders = [
    { supplier: createdSuppliers[0], status: "received", daysAgo: 45, items: [0, 1, 2], qty: [100, 50, 80] },
    { supplier: createdSuppliers[0], status: "received", daysAgo: 20, items: [3, 4], qty: [60, 40] },
    { supplier: createdSuppliers[1], status: "received", daysAgo: 35, items: [5, 6, 7], qty: [200, 150, 100] },
    { supplier: createdSuppliers[1], status: "ordered", daysAgo: 5, items: [0, 1], qty: [120, 80] },
    { supplier: createdSuppliers[2], status: "received", daysAgo: 60, items: [8, 9, 10], qty: [90, 70, 50] },
    { supplier: createdSuppliers[2], status: "ordered", daysAgo: 10, items: [11, 12], qty: [40, 30] },
    { supplier: createdSuppliers[3], status: "received", daysAgo: 50, items: [13, 14], qty: [60, 45] },
    { supplier: createdSuppliers[4], status: "draft", daysAgo: 2, items: [15, 16, 17], qty: [100, 80, 50] },
  ];

  let orderNum = 1;
  for (const order of orders) {
    const orderNumber = `OC-${1000 + orderNum}`;
    const existing = await db.purchaseOrder.findUnique({ where: { orderNumber } });
    if (existing) { orderNum++; continue; }

    const itemsData = order.items.map((idx, i) => {
      const p = products[idx % products.length];
      return { productId: p.id, quantity: order.qty[i], unitCost: p.costPrice, lineTotal: +(p.costPrice * order.qty[i]).toFixed(2) };
    });
    const total = +itemsData.reduce((s, it) => s + it.lineTotal, 0).toFixed(2);
    const createdAt = daysAgo(order.daysAgo);

    const po = await db.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: order.supplier.id,
        userId: userId ?? null,
        status: order.status,
        total,
        orderedAt: order.status !== "draft" ? createdAt : null,
        receivedAt: order.status === "received" ? daysAgo(order.daysAgo - 7) : null,
        createdAt,
        items: { create: itemsData },
      },
    });

    // Si está recibida, crear lotes
    if (order.status === "received") {
      for (const it of itemsData) {
        const lotNumber = `L${orderNum}-${Math.floor(Math.random() * 9000) + 1000}`;
        const expiry = daysAgo(-365 - Math.floor(Math.random() * 365));
        await db.lot.create({
          data: { productId: it.productId, lotNumber, expiryDate: expiry, quantity: it.quantity, initialQty: it.quantity },
        });
        await db.purchaseOrderItem.updateMany({
          where: { purchaseOrderId: po.id, productId: it.productId },
          data: { receivedQty: it.quantity, lotNumber, expiryDate: expiry },
        });
      }
    }

    console.log(`  ✅ ${orderNumber} · ${order.supplier.name} · ${order.status} · $${total}`);
    orderNum++;
  }

  console.log("\n✅ Seed de proveedores completado!");
  console.log(`   ${createdSuppliers.length} proveedores`);
  console.log(`   ${orderNum - 1} órdenes de compra`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
