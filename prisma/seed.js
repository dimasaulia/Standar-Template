const prisma = require("./client");
async function main() {}

main()
    .catch((e) => {
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
