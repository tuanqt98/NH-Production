import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAllPasswords() {
    const newHash = await bcrypt.hash('1', 12);
    console.log('New hash for "1":', newHash);
    console.log('Verify:', await bcrypt.compare('1', newHash));

    const result = await prisma.user.updateMany({
        data: { passwordHash: newHash },
    });

    console.log(`Updated ${result.count} users`);

    // Verify
    const users = await prisma.user.findMany({ select: { username: true, passwordHash: true } });
    for (const u of users) {
        const ok = await bcrypt.compare('1', u.passwordHash);
        console.log(`  ${u.username}: password='1' matches? ${ok}`);
    }
}

resetAllPasswords()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
