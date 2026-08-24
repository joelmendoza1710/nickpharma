import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "card", "transfer", "mixed"]);

export const prescriptionSchema = z.object({
  doctorName: z.string().min(1, "El nombre del médico es obligatorio").max(200),
  doctorLicense: z.string().min(1, "La licencia del médico es obligatoria").max(50),
  prescriptionNumber: z.string().min(1, "El número de receta es obligatorio").max(50),
  prescriptionDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha de receta inválida"),
  notes: z.string().max(500).optional(),
});

export const createSaleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, "productId es requerido"),
    quantity: z.number().int().positive("quantity debe ser un entero positivo"),
  })).min(1, "La venta debe contener al menos un producto"),
  customerId: z.string().nullable().optional(),
  paymentMethod: paymentMethodSchema.default("cash"),
  cashReceived: z.number().nonnegative().nullable().optional(),
  discount: z.number().nonnegative().default(0),
  pointsToRedeem: z.number().int().nonnegative().optional(),
  prescription: prescriptionSchema.optional(),
});

export const createLotSchema = z.object({
  productId: z.string().min(1, "productId es requerido"),
  lotNumber: z.string().min(1, "lotNumber es requerido").max(50),
  expiryDate: z.string().refine((v) => !isNaN(Date.parse(v)), "expiryDate inválida"),
  quantity: z.number().int().positive("quantity debe ser positivo"),
});

export const createCustomerSchema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio").max(200),
  document: z.string().max(50).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email("email inválido").nullable().optional().or(z.literal("")),
  address: z.string().max(300).nullable().optional(),
  allergies: z.string().max(500).nullable().optional(),
  chronicConditions: z.string().max(500).nullable().optional(),
  bloodType: z.string().max(10).nullable().optional(),
  emergencyContact: z.string().max(100).nullable().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  activeIngredient: z.string().max(200).nullable().optional(),
  presentation: z.string().max(100).nullable().optional(),
  dosage: z.string().max(50).nullable().optional(),
  barcode: z.string().min(1, "El código de barras es obligatorio").max(50),
  laboratory: z.string().max(100).nullable().optional(),
  salePrice: z.number().nonnegative("El precio de venta no puede ser negativo"),
  costPrice: z.number().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(10),
  requiresPrescription: z.boolean().default(false),
  taxRate: z.number().min(0).max(1).default(0),
  categoryId: z.string().min(1, "La categoría es obligatoria"),
  cum: z.string().max(50).nullable().optional(),
  invimaRegistration: z.string().max(50).nullable().optional(),
  invimaExpiryDate: z.string().nullable().optional(),
  therapeuticAction: z.string().max(200).nullable().optional(),
  initialLot: z.object({
    lotNumber: z.string().min(1).max(50),
    expiryDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha de vencimiento inválida"),
    quantity: z.number().int().positive("La cantidad debe ser positiva"),
  }).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(50).default("emerald"),
});

export const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  password: z.string().min(8, "Mínimo 8 caracteres").regex(/[A-Z]/, "Al menos 1 mayúscula").regex(/[a-z]/, "Al menos 1 minúscula").regex(/[0-9]/, "Al menos 1 número").max(100),
  role: z.enum(["ADMIN", "SUPERVISOR", "CASHIER", "PHARMACIST"]),
  active: z.boolean().default(true),
});

export const reportsQuerySchema = z.object({
  days: z.string().optional().refine((v) => !v || (!isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) <= 365), "days debe ser 1-365"),
  categoryId: z.string().min(1).optional(),
  paymentMethod: z.enum(["cash", "card", "transfer", "mixed"]).optional(),
}).passthrough();
