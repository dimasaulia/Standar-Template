const { PrismaClient } = require("@prisma/client");
const { getUser } = require("../../services/auth");
const { resSuccess, resError } = require("../../services/responseHandler");
const prisma = new PrismaClient();
const ITEM_LIMIT = Number(process.env.ITEM_LIMIT) || 10;

/**
 * Controller yang digunakan untuk menampilkan list role yang tersedia. Contrroler mengimplementasikan paginasi berbasis cursor dengan maksimal output setiap request adalah 10 object.
 * @param cursor berasal dari req.query, jika kursor kosong maka data yang akan tampil adalah 10 data pertama di database, jika terdapat kursor maka data yang akan tampil adalah 10 data di dataabse setelah cursor yang diberikan
 * @param search berasal dari req.query, parameter opsional jika terdapat isian pada query maka data yang ditampilkan adalah data yang sesuai dengan hasil pencarian
 * @returns list dari role yang tersedia, dengan maksimum keluaran sebanyak 10 objek.
 */
exports.list = async (req, res) => {
    const { search, cursor } = req.query;
    let roleList;
    try {
        if (search) {
            if (!cursor) {
                roleList = await prisma.role.findMany({
                    where: {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    orderBy: {
                        name: "asc",
                    },
                    take: ITEM_LIMIT,
                });
            }

            if (cursor) {
                roleList = await prisma.role.findMany({
                    where: {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    orderBy: {
                        name: "asc",
                    },
                    take: ITEM_LIMIT,
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                });
            }
        }

        if (!search) {
            if (!cursor) {
                roleList = await prisma.role.findMany({
                    orderBy: {
                        name: "asc",
                    },
                    take: ITEM_LIMIT,
                });
            }
            if (cursor) {
                roleList = await prisma.role.findMany({
                    orderBy: {
                        name: "asc",
                    },
                    take: ITEM_LIMIT,
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                });
            }
        }

        return resSuccess({
            res,
            title: "Success listed all role",
            data: roleList,
        });
    } catch (error) {
        return resError({ res, errors: error });
    }
};

exports.detail = async (req, res) => {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
        where: {
            id,
        },
    });

    return resSuccess({
        res,
        title: `Success get detail of ${role.name}`,
        data: role,
    });
};

exports.create = async (req, res) => {
    try {
        const { name } = req.body;
        const newRole = await prisma.role.create({
            data: {
                name: name.toUpperCase(),
            },
        });
        return resSuccess({
            res,
            title: `Success created role of ${newRole.name}`,
            data: newRole,
        });
    } catch (error) {
        return resError({ res, errors: error });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRole = await prisma.role.delete({
            where: {
                id,
            },
        });
        return resSuccess({
            res,
            title: `Success deleted role of ${deletedRole.name}`,
            data: deletedRole,
        });
    } catch (error) {
        return resError({ res, errors: error });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const updatedRole = await prisma.role.update({
            where: {
                id,
            },
            data: {
                name: name.toUpperCase(),
            },
        });
        return resSuccess({
            res,
            title: `Success updated role of ${updatedRole.name}`,
            data: updatedRole,
        });
    } catch (error) {
        return resError({ res, errors: error });
    }
};

exports.setUserRole = async (req, res) => {
    const { username, role } = req.body;
    try {
        const updatedUser = await prisma.role.update({
            where: { name: role },
            data: { user: { connect: { username } } },
        });
        resSuccess({
            res,
            code: 201,
            title: "Success update user",
            data: updatedUser,
        });
    } catch (error) {
        return resError({ res, errors: error });
    }
};
