import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { enrollNumber: { not: null } },
        select: { id: true, fullName: true, enrollNumber: true }
    });
    console.log('Users with enrollNumber:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
