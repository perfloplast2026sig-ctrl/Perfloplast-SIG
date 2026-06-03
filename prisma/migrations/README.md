Las migraciones se generaran con Prisma cuando exista `DATABASE_URL` y se confirme el modelo inicial.

Comando previsto, despues de configurar `.env` con tu password real de MySQL:

```bash
npx prisma migrate dev --name init_inventory_system
npm run db:seed
```
