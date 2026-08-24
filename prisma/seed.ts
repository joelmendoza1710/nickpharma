import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";

const db = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("🧹 Limpiando datos previos...");
  await db.auditLog.deleteMany();
  await db.stockMovement.deleteMany();
  await db.prescription.deleteMany();
  await db.saleItemLot.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.cashShift.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.supplier.deleteMany();
  await db.lot.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.customer.deleteMany();

  console.log("📁 Creando categorías...");
  const categories = await Promise.all([
    db.category.create({ data: { name: "Analgésicos", description: "Alivio del dolor", color: "emerald" } }),
    db.category.create({ data: { name: "Antibióticos", description: "Requieren receta", color: "rose" } }),
    db.category.create({ data: { name: "Antiinflamatorios", description: "Reducción de inflamación", color: "amber" } }),
    db.category.create({ data: { name: "Antialérgicos", description: "Alergias y resfriados", color: "violet" } }),
    db.category.create({ data: { name: "Gastrointestinal", description: "Estómago e intestinos", color: "cyan" } }),
    db.category.create({ data: { name: "Vitaminas y Suplementos", description: "Bienestar diario", color: "sky" } }),
    db.category.create({ data: { name: "Dermatológicos", description: "Cuidado de la piel", color: "teal" } }),
    db.category.create({ data: { name: "Cardiovascular", description: "Salud del corazón", color: "rose" } }),
    db.category.create({ data: { name: "Cuidado Personal", description: "Higiene y belleza", color: "emerald" } }),
  ]);

  const cat = (n: string) => categories.find((c) => c.name === n)!;

  console.log("💊 Creando productos y lotes...");
  type Seed = {
    name: string;
    active: string;
    presentation: string;
    dosage: string;
    barcode: string;
    lab: string;
    sale: number;
    cost: number;
    min: number;
    rx: boolean;
    cat: string;
    lots: { qty: number; expiryDays: number }[];
  };

  const seeds: Seed[] = [
    // Analgésicos
    { name: "Acetaminofén", active: "Acetaminofén", presentation: "Tabletas", dosage: "500mg", barcode: "7701001000011", lab: "Genfar", sale: 3.5, cost: 1.8, min: 30, rx: false, cat: "Analgésicos", lots: [{ qty: 240, expiryDays: 420 }, { qty: 80, expiryDays: 60 }] },
    { name: "Acetaminofén", active: "Acetaminofén", presentation: "Jarabe", dosage: "120mg/5ml", barcode: "7701001000028", lab: "Genfar", sale: 8.9, cost: 5.2, min: 15, rx: false, cat: "Analgésicos", lots: [{ qty: 40, expiryDays: 200 }] },
    { name: "Ibuprofeno", active: "Ibuprofeno", presentation: "Tabletas", dosage: "200mg", barcode: "7701001000035", lab: "Cofal", sale: 4.2, cost: 2.1, min: 30, rx: false, cat: "Antiinflamatorios", lots: [{ qty: 180, expiryDays: 365 }] },
    { name: "Ibuprofeno", active: "Ibuprofeno", presentation: "Tabletas", dosage: "400mg", barcode: "7701001000042", lab: "Cofal", sale: 5.8, cost: 2.9, min: 30, rx: false, cat: "Antiinflamatorios", lots: [{ qty: 150, expiryDays: 400 }, { qty: 8, expiryDays: 25 }] },
    { name: "Ibuprofeno", active: "Ibuprofeno", presentation: "Tabletas", dosage: "800mg", barcode: "7701001000059", lab: "Cofal", sale: 8.5, cost: 4.4, min: 20, rx: true, cat: "Antiinflamatorios", lots: [{ qty: 60, expiryDays: 500 }] },
    { name: "Naproxeno", active: "Naproxeno sódico", presentation: "Tabletas", dosage: "550mg", barcode: "7701001000066", lab: "Bayer", sale: 9.2, cost: 5.0, min: 20, rx: false, cat: "Antiinflamatorios", lots: [{ qty: 90, expiryDays: 380 }] },
    { name: "Aspirina", active: "Ácido acetilsalicílico", presentation: "Tabletas", dosage: "100mg", barcode: "7701001000073", lab: "Bayer", sale: 3.0, cost: 1.4, min: 40, rx: false, cat: "Cardiovascular", lots: [{ qty: 300, expiryDays: 600 }] },
    { name: "Dexketoprofeno", active: "Dexketoprofeno", presentation: "Tabletas", dosage: "25mg", barcode: "7701001000080", lab: "Menarini", sale: 12.5, cost: 7.0, min: 15, rx: true, cat: "Antiinflamatorios", lots: [{ qty: 5, expiryDays: 90 }] },
    // Antibióticos
    { name: "Amoxicilina", active: "Amoxicilina", presentation: "Cápsulas", dosage: "500mg", barcode: "7701001000097", lab: "Tecnoquímicas", sale: 11.0, cost: 6.2, min: 20, rx: true, cat: "Antibióticos", lots: [{ qty: 70, expiryDays: 300 }] },
    { name: "Amoxicilina + Ácido Clavulánico", active: "Amoxicilina + Clavulánico", presentation: "Tabletas", dosage: "875mg+125mg", barcode: "7701001000103", lab: "Tecnoquímicas", sale: 18.5, cost: 10.5, min: 15, rx: true, cat: "Antibióticos", lots: [{ qty: 40, expiryDays: 280 }] },
    { name: "Azitromicina", active: "Azitromicina", presentation: "Tabletas", dosage: "500mg", barcode: "7701001000110", lab: "Pfizer", sale: 22.0, cost: 13.0, min: 15, rx: true, cat: "Antibióticos", lots: [{ qty: 25, expiryDays: 200 }] },
    { name: "Ciprofloxacino", active: "Ciprofloxacino", presentation: "Tabletas", dosage: "500mg", barcode: "7701001000127", lab: "Bayer", sale: 9.5, cost: 5.0, min: 20, rx: true, cat: "Antibióticos", lots: [{ qty: 3, expiryDays: 45 }] },
    // Antialérgicos
    { name: "Loratadina", active: "Loratadina", presentation: "Tabletas", dosage: "10mg", barcode: "7701001000134", lab: "Schering-Plough", sale: 6.5, cost: 3.2, min: 25, rx: false, cat: "Antialérgicos", lots: [{ qty: 120, expiryDays: 450 }] },
    { name: "Cetirizina", active: "Cetirizina", presentation: "Tabletas", dosage: "10mg", barcode: "7701001000141", lab: "GSK", sale: 5.9, cost: 2.8, min: 25, rx: false, cat: "Antialérgicos", lots: [{ qty: 95, expiryDays: 360 }] },
    { name: "Difenhidramina", active: "Difenhidramina", presentation: "Jarabe", dosage: "12.5mg/5ml", barcode: "7701001000158", lab: "GSK", sale: 10.2, cost: 5.6, min: 12, rx: false, cat: "Antialérgicos", lots: [{ qty: 30, expiryDays: 220 }] },
    // Gastrointestinal
    { name: "Omeprazol", active: "Omeprazol", presentation: "Cápsulas", dosage: "20mg", barcode: "7701001000165", lab: "AstraZeneca", sale: 8.8, cost: 4.5, min: 25, rx: false, cat: "Gastrointestinal", lots: [{ qty: 160, expiryDays: 480 }] },
    { name: "Ranitidina", active: "Ranitidina", presentation: "Tabletas", dosage: "150mg", barcode: "7701001000172", lab: "GSK", sale: 7.2, cost: 3.8, min: 20, rx: false, cat: "Gastrointestinal", lots: [{ qty: 6, expiryDays: 30 }] },
    { name: "Loperamida", active: "Loperamida", presentation: "Cápsulas", dosage: "2mg", barcode: "7701001000189", lab: "Janssen", sale: 4.5, cost: 2.0, min: 20, rx: false, cat: "Gastrointestinal", lots: [{ qty: 110, expiryDays: 400 }] },
    { name: "Sales de Rehidratación Oral", active: "SRO", presentation: "Sobre", dosage: "20.5g", barcode: "7701001000196", lab: "OMS", sale: 2.8, cost: 1.2, min: 50, rx: false, cat: "Gastrointestinal", lots: [{ qty: 250, expiryDays: 540 }] },
    // Vitaminas
    { name: "Vitamina C", active: "Ácido ascórbico", presentation: "Tabletas", dosage: "1000mg", barcode: "7701001000202", lab: "Vitalis", sale: 12.0, cost: 6.0, min: 30, rx: false, cat: "Vitaminas y Suplementos", lots: [{ qty: 200, expiryDays: 580 }] },
    { name: "Complejo B", active: "Vitaminas del complejo B", presentation: "Tabletas", dosage: "B1+B6+B12", barcode: "7701001000219", lab: "Vitalis", sale: 14.5, cost: 7.5, min: 25, rx: false, cat: "Vitaminas y Suplementos", lots: [{ qty: 140, expiryDays: 500 }] },
    { name: "Vitamina D3", active: "Colecalciferol", presentation: "Cápsulas", dosage: "1000UI", barcode: "7701001000226", lab: "Vitalis", sale: 16.8, cost: 8.8, min: 20, rx: false, cat: "Vitaminas y Suplementos", lots: [{ qty: 85, expiryDays: 460 }] },
    { name: "Calcio + Vitamina D", active: "Carbonato de calcio + Colecalciferol", presentation: "Tabletas", dosage: "600mg+400UI", barcode: "7701001000233", lab: "GNC", sale: 24.0, cost: 13.0, min: 15, rx: false, cat: "Vitaminas y Suplementos", lots: [{ qty: 60, expiryDays: 420 }] },
    // Dermatológicos
    { name: "Crema Hidrocortisona", active: "Hidrocortisona", presentation: "Crema", dosage: "1%", barcode: "7701001000240", lab: "Bayer", sale: 13.5, cost: 7.0, min: 15, rx: false, cat: "Dermatológicos", lots: [{ qty: 45, expiryDays: 350 }] },
    { name: "Crema Clotrimazol", active: "Clotrimazol", presentation: "Crema", dosage: "1%", barcode: "7701001000257", lab: "Bayer", sale: 11.0, cost: 5.8, min: 15, rx: false, cat: "Dermatológicos", lots: [{ qty: 38, expiryDays: 320 }] },
    { name: " protector solar FPS 50", active: "Filtros solares", presentation: "Loción", dosage: "FPS 50", barcode: "7701001000264", lab: "Eucerin", sale: 45.0, cost: 26.0, min: 10, rx: false, cat: "Dermatológicos", lots: [{ qty: 22, expiryDays: 700 }] },
    // Cardiovascular
    { name: "Losartán", active: "Losartán potásico", presentation: "Tabletas", dosage: "50mg", barcode: "7701001000271", lab: "Merck", sale: 10.5, cost: 5.5, min: 25, rx: true, cat: "Cardiovascular", lots: [{ qty: 130, expiryDays: 440 }] },
    { name: "Amlodipino", active: "Amlodipino", presentation: "Tabletas", dosage: "5mg", barcode: "7701001000288", lab: "Pfizer", sale: 9.0, cost: 4.8, min: 25, rx: true, cat: "Cardiovascular", lots: [{ qty: 110, expiryDays: 410 }] },
    { name: "Atorvastatina", active: "Atorvastatina", presentation: "Tabletas", dosage: "20mg", barcode: "7701001000295", lab: "Pfizer", sale: 15.5, cost: 8.5, min: 20, rx: true, cat: "Cardiovascular", lots: [{ qty: 75, expiryDays: 390 }] },
    { name: "Enalapril", active: "Enalapril maleato", presentation: "Tabletas", dosage: "10mg", barcode: "7701001000301", lab: "Merck", sale: 8.2, cost: 4.2, min: 25, rx: true, cat: "Cardiovascular", lots: [{ qty: 4, expiryDays: 20 }] },
    // Cuidado personal
    { name: "Alcohol Etílico", active: "Etanol", presentation: "Líquido", dosage: "70%", barcode: "7701001000318", lab: "Disagro", sale: 5.5, cost: 2.5, min: 30, rx: false, cat: "Cuidado Personal", lots: [{ qty: 180, expiryDays: 900 }] },
    { name: "Alcohol en Gel", active: "Etanol", presentation: "Gel", dosage: "70%", barcode: "7701001000325", lab: "Disagro", sale: 7.8, cost: 3.8, min: 30, rx: false, cat: "Cuidado Personal", lots: [{ qty: 150, expiryDays: 800 }] },
    { name: "Mascarillas Quirúrgicas (caja)", active: "N/A", presentation: "Caja x50", dosage: "3 capas", barcode: "7701001000332", lab: "3M", sale: 18.0, cost: 9.0, min: 15, rx: false, cat: "Cuidado Personal", lots: [{ qty: 70, expiryDays: 1000 }] },
    { name: "Termómetro Digital", active: "N/A", presentation: "Dispositivo", dosage: "1 unidad", barcode: "7701001000349", lab: "Omron", sale: 35.0, cost: 20.0, min: 8, rx: false, cat: "Cuidado Personal", lots: [{ qty: 18, expiryDays: 1500 }] },
  ];

  for (const s of seeds) {
    const product = await db.product.create({
      data: {
        name: s.name,
        activeIngredient: s.active,
        presentation: s.presentation,
        dosage: s.dosage,
        barcode: s.barcode,
        laboratory: s.lab,
        salePrice: s.sale,
        costPrice: s.cost,
        minStock: s.min,
        requiresPrescription: s.rx,
        taxRate: 0,
        categoryId: cat(s.cat).id,
        lots: {
          create: s.lots.map((l, i) => ({
            lotNumber: `L${s.barcode.slice(-4)}-${i + 1}`,
            expiryDate: daysFromNow(l.expiryDays),
            quantity: l.qty,
            initialQty: l.qty,
          })),
        },
      },
    });
  }

  console.log("👥 Creando clientes...");
  const customers = [
    { fullName: "Consumidor Final", document: "CF", phone: null, email: null, address: null, loyaltyPoints: 0 },
    { fullName: "María Fernanda López", document: "230012345", phone: "+57 300 123 4567", email: "maria.lopez@email.com", address: "Calle 45 #23-18", loyaltyPoints: 320 },
    { fullName: "Carlos Andrés Gómez", document: "900456789", phone: "+57 311 987 6543", email: "carlos.gomez@email.com", address: "Cra 15 #80-22", loyaltyPoints: 150 },
    { fullName: "Diana Patricia Ruiz", document: "430210678", phone: "+57 320 555 1234", email: "diana.ruiz@email.com", address: "Av. Caracas #14-50", loyaltyPoints: 480 },
    { fullName: "Juan Sebastián Morales", document: "110023890", phone: "+57 318 444 9876", email: "juan.morales@email.com", address: "Calle 100 #15-30", loyaltyPoints: 75 },
    { fullName: "Clínica San Rafael", document: "900123456-1", phone: "+57 601 555 0011", email: "compras@clinicasanrafael.com", address: "Av. Boyacá #68-40", loyaltyPoints: 1250 },
    { fullName: "Farmacia La Esperanza", document: "900654321-2", phone: "+57 601 333 2244", email: "contacto@farmaciaesperanza.com", address: "Cra 30 #40-15", loyaltyPoints: 2100 },
  ];
  for (const c of customers) {
    await db.customer.create({ data: c });
  }

  console.log("🧾 Generando historial de ventas (últimos 30 días)...");
  const allProducts = await db.product.findMany({ include: { lots: true } });
  const cfCustomer = await db.customer.findFirst({ where: { document: "CF" } });
  const frequentCustomers = await db.customer.findMany({ where: { NOT: { document: "CF" } } });
  const cashiers = ["Ana Torres", "Luis Ramírez", "Sofía Castro", "Pedro Mendoza"];
  const paymentMethods = ["cash", "card", "transfer"];

  let invoiceCounter = 1001;
  const now = new Date();

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    // entre 8 y 25 ventas por día
    const salesCount = randomInt(8, 26);
    for (let i = 0; i < salesCount; i++) {
      const itemsCount = randomInt(1, 5);
      const items: any[] = [];
      let subtotal = 0;
      for (let j = 0; j < itemsCount; j++) {
        const p = allProducts[randomInt(0, allProducts.length)];
        const lotWithStock = p.lots.find((l) => l.quantity > 0);
        if (!lotWithStock) continue;
        const qty = randomInt(1, 4);
        const unitPrice = p.salePrice;
        const lineTotal = +(qty * unitPrice).toFixed(2);
        subtotal += lineTotal;
        items.push({
          productId: p.id,
          quantity: qty,
          unitPrice,
          lineTotal,
          lotId: lotWithStock.id,
        });
      }
      if (items.length === 0) continue;
      subtotal = +subtotal.toFixed(2);
      const taxTotal = 0;
      const total = +(subtotal + taxTotal).toFixed(2);
      const paymentMethod = paymentMethods[randomInt(0, paymentMethods.length)];
      const cashReceived = paymentMethod === "cash" ? Math.ceil(total / 5) * 5 : total;
      const change = paymentMethod === "cash" ? +(cashReceived - total).toFixed(2) : 0;
      // 35% ventas a cliente identificado
      const useFrequent = Math.random() < 0.35 && frequentCustomers.length > 0;
      const customer = useFrequent
        ? frequentCustomers[randomInt(0, frequentCustomers.length)]
        : cfCustomer;

      const saleTime = new Date(day);
      saleTime.setHours(randomInt(7, 21), randomInt(0, 60), 0, 0);

      await db.sale.create({
        data: {
          invoiceNumber: `FAC-${invoiceCounter++}`,
          customerId: customer?.id,
          subtotal,
          taxTotal,
          discount: 0,
          total,
          paymentMethod,
          cashReceived,
          change,
          status: "completed",
          cashierName: cashiers[randomInt(0, cashiers.length)],
          createdAt: saleTime,
          items: { create: items },
        },
      });
    }
  }

  console.log("✅ Seed completado!");
  const stats = {
    categorias: await db.category.count(),
    productos: await db.product.count(),
    lotes: await db.lot.count(),
    clientes: await db.customer.count(),
    ventas: await db.sale.count(),
  };
  console.log(stats);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
