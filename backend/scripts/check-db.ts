import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        include: { role: true }
    });
    console.log('Users in DB:');
    for (const user of users) {
        const isMatch = await bcrypt.compare('1', user.passwordHash);
        console.log(`- ${user.username} (${user.role.name}): password matches '1'? ${isMatch}`);
    }
}

check().finally(() => prisma.$disconnect());
