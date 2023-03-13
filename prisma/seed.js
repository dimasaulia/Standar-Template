const prisma = require("../prisma/client");
async function main() {}

main()
    .catch((e) => {
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
