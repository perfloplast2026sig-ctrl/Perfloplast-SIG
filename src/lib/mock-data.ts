import type { Role, StatusBadge } from "@/types";

export const currentUser = {
  name: "Sofia Portillo",
  role: "Super admin" as Role,
  location: "Planta Central",
};

export const kpis = [
  { label: "Productos registrados", value: "1,284", change: "+42 este mes", tone: "success" as const },
  { label: "Stock bajo", value: "37", change: "12 criticos", tone: "warning" as const },
  { label: "Preventas pendientes", value: "86", change: "$48.2k estimado", tone: "info" as const },
  { label: "Ordenes activas", value: "14", change: "71% avance promedio", tone: "neutral" as const },
  { label: "Despachos programados", value: "22", change: "8 salen hoy", tone: "success" as const },
];

export const inventoryMix = [
  { label: "Materia prima", value: 42 },
  { label: "Producto terminado", value: 35 },
  { label: "En camiones", value: 14 },
  { label: "Reservado", value: 9 },
];

export const activity = [
  { event: "Entrada de resina PP", detail: "Bodega MP-01", time: "Hace 12 min", amount: "+1,200 kg" },
  { event: "Preventa confirmada", detail: "Cliente Norte Industrial", time: "Hace 26 min", amount: "18 items" },
  { event: "Traslado a camion C-07", detail: "Ruta San Miguel", time: "Hace 43 min", amount: "-320 cajas" },
  { event: "Orden OP-1048 cerrada", detail: "Turno nocturno", time: "Hace 1 h", amount: "+5,800 un" },
];

export const alerts = [
  { title: "Materia prima bajo minimo", detail: "Pigmento azul queda para 1.8 dias de produccion.", tone: "danger" as const },
  { title: "Camion pendiente de cierre", detail: "C-03 tiene carga registrada sin estado en ruta.", tone: "warning" as const },
  { title: "Preventa grande sin reserva", detail: "PV-2319 supera disponibilidad en Bodega PT-02.", tone: "warning" as const },
];

export const products = [
  { sku: "MP-RES-PP-25", name: "Resina polipropileno 25 kg", type: "Materia prima", location: "Bodega MP-01", stock: "8,420 kg", min: "5,000 kg", status: { label: "Saludable", tone: "success" } as StatusBadge },
  { sku: "MP-PIG-AZU", name: "Pigmento azul industrial", type: "Materia prima", location: "Bodega MP-02", stock: "92 kg", min: "180 kg", status: { label: "Bajo minimo", tone: "danger" } as StatusBadge },
  { sku: "PT-CAJ-18L", name: "Caja plastica 18 L", type: "Terminado", location: "Bodega PT-01", stock: "12,880 un", min: "4,000 un", status: { label: "Disponible", tone: "success" } as StatusBadge },
  { sku: "PT-TAP-110", name: "Tapa industrial 110 mm", type: "Terminado", location: "Camion C-07", stock: "1,440 un", min: "900 un", status: { label: "En ruta", tone: "info" } as StatusBadge },
];

export const kardex = [
  { code: "MOV-8841", type: "Entrada", product: "Resina polipropileno", from: "Proveedor", to: "Bodega MP-01", qty: "+1,200 kg", user: "Bodeguero", date: "Hoy 08:12" },
  { code: "MOV-8840", type: "Consumo", product: "Pigmento azul", from: "Bodega MP-02", to: "OP-1049", qty: "-24 kg", user: "Bodeguero", date: "Hoy 07:40" },
  { code: "MOV-8839", type: "Traslado", product: "Caja plastica 18 L", from: "PT-01", to: "Camion C-07", qty: "-320 un", user: "Piloto", date: "Ayer 17:30" },
];

export const preorders = [
  { code: "PV-2319", client: "Norte Industrial", products: "18 items", availability: "Parcial", total: "$18,420", status: { label: "Pendiente", tone: "warning" } as StatusBadge },
  { code: "PV-2318", client: "Distribuidora Central", products: "7 items", availability: "Completa", total: "$7,860", status: { label: "Confirmada", tone: "success" } as StatusBadge },
  { code: "PV-2314", client: "Ferreteria Los Altos", products: "5 items", availability: "Reservada", total: "$3,110", status: { label: "Despachada", tone: "info" } as StatusBadge },
];

export const productionOrders = [
  { code: "OP-1049", product: "Caja plastica 18 L", shift: "Matutino", input: "Resina PP + pigmento", output: "5,800 / 8,000 un", waste: "1.8%", progress: 72, status: { label: "En proceso", tone: "info" } as StatusBadge },
  { code: "OP-1048", product: "Tapa industrial 110 mm", shift: "Nocturno", input: "Resina HDPE", output: "12,000 / 12,000 un", waste: "0.9%", progress: 100, status: { label: "Cerrada", tone: "success" } as StatusBadge },
  { code: "OP-1047", product: "Contenedor 60 L", shift: "Vespertino", input: "Resina PP", output: "1,200 / 2,400 un", waste: "2.4%", progress: 50, status: { label: "Pausada", tone: "warning" } as StatusBadge },
];

export const shipments = [
  { code: "DSP-771", truck: "C-07", driver: "Luis Mejia", route: "San Miguel", load: "2,140 un", status: { label: "Cargado", tone: "info" } as StatusBadge },
  { code: "DSP-770", truck: "C-03", driver: "Ana Portillo", route: "Occidente", load: "920 un", status: { label: "Programado", tone: "warning" } as StatusBadge },
  { code: "DSP-768", truck: "C-11", driver: "Carlos Rivas", route: "Centro", load: "1,450 un", status: { label: "Entregado", tone: "success" } as StatusBadge },
];

export const roles = [
  { role: "Super admin", scope: "Control total del sistema, usuarios, roles, permisos y auditoria", users: 1 },
  { role: "Administrador", scope: "Gestion operativa, dashboard, usuarios internos y autorizaciones", users: 3 },
  { role: "Contaduria", scope: "Reportes, costos, inventario valorizado y movimientos auditables", users: 2 },
  { role: "Piloto", scope: "Despachos asignados, carga del camion, ruta y estado de entrega", users: 8 },
  { role: "Vendedor", scope: "Clientes, preventas, disponibilidad y seguimiento comercial", users: 12 },
  { role: "Bodeguero", scope: "Entradas, salidas, traslados, ajustes, Kardex e inventario fisico", users: 9 },
];

export const users = [
  { id: "mock-super-admin", name: "Sofia Portillo", email: "sofia.portillo@perfloplast.com", role: "Super admin" as Role, area: "Direccion", isActive: true, isProtected: true, status: { label: "Activo", tone: "success" } as StatusBadge, lastLogin: "Hoy 08:34" },
  { id: "mock-admin", name: "Carlos Mejia", email: "carlos.mejia@perfloplast.com", role: "Administrador" as Role, area: "Operaciones", isActive: true, isProtected: false, status: { label: "Activo", tone: "success" } as StatusBadge, lastLogin: "Hoy 07:58" },
  { id: "mock-accounting", name: "Nadia Lopez", email: "nadia.lopez@perfloplast.com", role: "Contaduria" as Role, area: "Finanzas", isActive: true, isProtected: false, status: { label: "Activo", tone: "success" } as StatusBadge, lastLogin: "Ayer 17:10" },
  { id: "mock-driver", name: "Luis Rivas", email: "luis.rivas@perfloplast.com", role: "Piloto" as Role, area: "Despachos", isActive: true, isProtected: false, status: { label: "En ruta", tone: "info" } as StatusBadge, lastLogin: "Hoy 06:20" },
  { id: "mock-seller", name: "Ana Guerra", email: "ana.guerra@perfloplast.com", role: "Vendedor" as Role, area: "Ventas", isActive: true, isProtected: false, status: { label: "Activo", tone: "success" } as StatusBadge, lastLogin: "Hace 35 min" },
  { id: "mock-warehouse", name: "Mario Calderon", email: "mario.calderon@perfloplast.com", role: "Bodeguero" as Role, area: "Bodega", isActive: true, isProtected: false, status: { label: "Activo", tone: "success" } as StatusBadge, lastLogin: "Hoy 05:55" },
];

export const reports = [
  { name: "Inventario valorizado", area: "Inventario", cadence: "Diario", export: "PDF / Excel" },
  { name: "Movimientos Kardex", area: "Bodega", cadence: "Por rango", export: "Excel" },
  { name: "Preventas por estado", area: "Ventas", cadence: "Semanal", export: "PDF" },
  { name: "Produccion y rechazos", area: "Produccion", cadence: "Por turno", export: "Excel" },
  { name: "Despachos y entregas", area: "Logistica", cadence: "Diario", export: "PDF / Excel" },
];
