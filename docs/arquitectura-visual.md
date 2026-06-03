# Arquitectura visual y funcional

## 1. Arquitectura visual

El sistema se plantea como un SaaS empresarial sobrio: fondo neutro, tarjetas blancas o grafito en modo oscuro, bordes finos, baja sombra, tipografia compacta y jerarquia clara. La pantalla prioriza lectura operativa antes que decoracion.

## 2. Mapa de navegacion

- Dashboard: indicadores, alertas, graficas, actividad y accesos por rol.
- Inventario: stock por ubicacion, entradas, salidas, traslados, ajustes y Kardex.
- Preventas: cliente, productos, disponibilidad, reserva, confirmacion y conversion a despacho.
- Produccion: ordenes, turnos, consumo de materia prima, producto terminado, avance y merma.
- Logistica: despachos, camiones, responsables, rutas, carga y estados.
- Usuarios: roles, permisos, matriz de acceso y auditoria.
- Reportes: inventario, movimientos, preventas, produccion, despachos y stock bajo.

## 3. Pantallas principales

- Dashboard ejecutivo con KPIs, alertas y actividad reciente.
- Inventario con filtros, tabla de stock, tarjetas de movimientos y Kardex.
- Preventas con flujo guiado de cliente a despacho.
- Produccion con ciclo por etapas y avance por orden.
- Logistica con carga activa y tabla de despachos.
- Usuarios con roles base y matriz de permisos.
- Reportes con catalogo preparado para PDF y Excel.

## 4. Componentes reutilizables

- `AppShell`, `Sidebar`, `Header`, `PageHeading`.
- `SectionCard`, `DataTable`, `Badge`, `Button`.
- Componentes por dominio: KPI, graficas compactas, flujo de inventario, constructor de preventa, ciclo de produccion, carga de camion, matriz de permisos.

## 5. Dashboard

Debe responder tres preguntas: que requiere atencion, que esta en movimiento y que puede ejecutar mi rol ahora. Los KPIs no son decorativos; apuntan a stock bajo, preventas, produccion y despachos.

## 6. Inventario

La UI separa saldos de movimientos. El saldo se lee por producto y ubicacion. Las operaciones permitidas son entrada, salida, traslado y ajuste. El Kardex sirve como evidencia auditable.

## 7. Preventas

La preventa no descuenta stock automaticamente como venta. Primero valida disponibilidad, luego reserva cantidades, despues confirma y finalmente puede generar despacho.

## 8. Produccion

La orden de produccion consume materia prima mediante movimientos de salida y genera producto terminado mediante movimientos de entrada. La merma queda registrada para costo y control operativo.

## 9. Logistica

El camion es una ubicacion movil. Cargar un camion es un traslado desde bodega hacia la ubicacion del camion. Entregar cierra el flujo comercial y logistico.

## 10. Usuarios y roles

La navegacion debe filtrarse por permisos. La UI no reemplaza la seguridad del servidor; solo reduce ruido. Las acciones sensibles deben validarse tambien en middleware, server actions o servicios.

## 11. Modelo inicial de datos

El modelo Prisma incluye productos, ubicaciones, saldos, movimientos, clientes, preventas, produccion, camiones, despachos, usuarios, roles, permisos y auditoria.

## 12. Estructura de carpetas

- `app/`: rutas App Router.
- `components/layout/`: estructura administrativa.
- `components/*/`: componentes por modulo.
- `lib/`: utilidades y datos mock temporales.
- `types/`: tipos compartidos.
- `prisma/`: schema y migraciones.
- `actions/`, `services/`, `hooks/`: siguiente capa para reglas, operaciones y estado de UI.

## 13. Modo claro y oscuro

El tema usa tokens CSS, no colores sueltos. Claro: fondo mineral, cards blancas y verde industrial como acento. Oscuro: grafito verdoso, bordes visibles y acento desaturado. Evitar gradientes fuertes y sombras grandes.
