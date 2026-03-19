import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const seedEmail = process.env.SEED_ADMIN_EMAIL;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  const seedName = process.env.SEED_ADMIN_NAME || "";

  if (!seedEmail || !seedPassword) {
    console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env before seeding.");
    process.exit(1);
  }

  const superAdminHash = await bcrypt.hash(seedPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: seedEmail },
    update: { passwordHash: superAdminHash, role: "superadmin", name: seedName },
    create: {
      email: seedEmail,
      name: seedName,
      passwordHash: superAdminHash,
      role: "superadmin",
    },
  });
  console.log("Created superadmin user:", admin.email);

  const route1 = await prisma.route.upsert({
    where: { slug: "year12/digital-solutions" },
    update: {},
    create: {
      yearLevel: "Year 12",
      subject: "Digital Solutions",
      slug: "year12/digital-solutions",
    },
  });

  const route2 = await prisma.route.upsert({
    where: { slug: "year11/engineering" },
    update: {},
    create: {
      yearLevel: "Year 11",
      subject: "Engineering",
      slug: "year11/engineering",
    },
  });

  console.log("Created routes:", route1.slug, route2.slug);

  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dueDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  await prisma.task.deleteMany({ where: { routeId: route1.id } });

  const task = await prisma.task.create({
    data: {
      routeId: route1.id,
      title: "IA2 — Digital Solution Development",
      description:
        "Design and develop a digital solution using iterative processes.",
      startDate,
      dueDate,
      isDraft: false,
      isPublished: true,
      isArchived: false,
      scaffoldPoints: {
        create: [
          {
            label: "Project Brief Due",
            internalDate: new Date(
              startDate.getTime() + 2 * 24 * 60 * 60 * 1000
            ),
            displayOrder: 1,
            position: "above",
            isKeyLabel: true,
          },
          {
            label: "Research & Analysis",
            internalDate: new Date(
              startDate.getTime() + 5 * 24 * 60 * 60 * 1000
            ),
            displayOrder: 2,
            position: "below",
            isKeyLabel: true,
          },
          {
            label: "Wireframes Complete",
            internalDate: new Date(
              startDate.getTime() + 9 * 24 * 60 * 60 * 1000
            ),
            displayOrder: 3,
            position: "above",
            isKeyLabel: true,
          },
          {
            label: "Prototype v1",
            internalDate: new Date(
              startDate.getTime() + 14 * 24 * 60 * 60 * 1000
            ),
            displayOrder: 4,
            position: "below",
            isKeyLabel: true,
          },
          {
            label: "User Testing",
            internalDate: new Date(
              startDate.getTime() + 18 * 24 * 60 * 60 * 1000
            ),
            displayOrder: 5,
            position: "above",
            isKeyLabel: true,
          },
          {
            label: "Refinement",
            internalDate: new Date(
              startDate.getTime() + 22 * 24 * 60 * 60 * 1000
            ),
            displayOrder: 6,
            position: "below",
            isKeyLabel: false,
          },
          {
            label: "Final Submission",
            internalDate: dueDate,
            displayOrder: 7,
            position: "above",
            isKeyLabel: true,
          },
        ],
      },
    },
  });

  console.log("Created task:", task.title);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
