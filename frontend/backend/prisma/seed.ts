import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const studentPassword = await bcrypt.hash('1234', 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { username: 'admin' },
      update: { role: 'ADMIN' },
      create: { username: 'admin', password: adminPassword, name: 'System Admin', role: 'ADMIN' },
    });

    const className = 'CNCD2511';
    await tx.class.upsert({
      where: { name: className },
      update: {},
      create: { name: className },
    });

    const student = await tx.student.upsert({
      where: { student_code: 'CNCD2511016' },
      update: {},
      create: {
        name: 'Sinh viên test',
        student_code: 'CNCD2511016',
        email: 'cncd2511016@example.com',
        class_id: className,
        order_number: 1,
      },
    });

    await tx.user.upsert({
      where: { username: 'cncd2511016' },
      update: { studentId: student.id, class_id: className, role: 'STUDENT' },
      create: {
        username: 'cncd2511016',
        password: studentPassword,
        name: student.name,
        email: student.email,
        role: 'STUDENT',
        studentId: student.id,
        class_id: className,
      },
    });
  });
  console.log('Seed complete: admin, class CNCD2511, and one test student.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
