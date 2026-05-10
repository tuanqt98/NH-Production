import { prisma } from './config/database.config';

async function check() {
    const latest = await prisma.productionOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(latest, null, 2));
    process.exit(0);
}
check();
