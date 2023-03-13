const { PrismaClient } = require("@prisma/client");
const {
    generateHash,
    setCookie,
    hashValidator,
    generateAuthorizationToken,
    getUser,
    generateResetUrl,
    getResetUrlPayload,
} = require("../../services/auth");
const {
    resError,
    resSuccess,
    ErrorException,
} = require("../../services/responseHandler");
const { sendEmail, urlTokenGenerator } = require("../../services/mailing");
const { random: stringGenerator } = require("@supercharge/strings");
const crypto = require("crypto");
const prisma = new PrismaClient();
const ITEM_LIMIT = Number(process.env.ITEM_LIMIT) || 10;

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: generateHash(password),
                role: { connect: { name: "USER" } },
                passwordUpdatedAt: new Date(Date.now() - 1000),
                profil: {
                    create: {
                        full_name: username,
                    },
                },
            },
            select: {
                id: true,
                username: true,
                email: true,
                roleId: true,
            },
        });

        setCookie({
            res,
            title: "Authorization",
            data: generateAuthorizationToken({
                data: { userID: newUser.id, username: newUser.username },
            }),
        });

        return resSuccess({
            res,
            title: "Success register user",
            data: newUser,
        });
    } catch (err) {
        console.log(err);
        return resError({ res, title: "Failed register user", errors: err });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // try find the user
        const user = await prisma.user.findUnique({
            where: {
                username,
            },
            select: {
                id: true,
                username: true,
                password: true,
                email: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // give response if cant find the user
        if (user === null)
            throw new ErrorException({
                type: "username",
                detail: "Cant find the user",
            });

        // compare user and password
        const auth = hashValidator(password, user.password);

        // give response if password not match
        if (!auth)
            throw new ErrorException({
                type: "password",
                detail: "Username and Password didn't match",
            });

        setCookie({
            res,
            title: "Authorization",
            data: generateAuthorizationToken({
                data: { userID: user.id, username: user.username },
            }),
        });

        return resSuccess({
            res,
            title: "Berhasil login",
            data: {
                username: user.username,
                email: user.email,
                id: user.id,
                role: user.role.name,
            },
        });
    } catch (err) {
        return resError({
            res,
            title: "Failed to login",
            errors: err,
            code: 401,
        });
    }
};

exports.logout = (req, res) => {
    setCookie({ res, title: "Authorization", data: "", maxAge: 1 });
    return resSuccess({ res, title: "Success logout user" });
};

exports.detail = async (req, res) => {
    try {
        const id = await getUser(req);
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                username: true,
                email: true,
                profil: { select: { full_name: true, photo: true } },
                role: { select: { name: true } },
            },
        });
        return resSuccess({
            res,
            title: "Success get user information",
            data: user,
        });
    } catch (error) {
        return resError({
            res,
            title: "Failed to get user data",
            errors: error,
        });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        //provide default or unupdated value
        const id = await getUser(req); // user id
        const user = await prisma.user.findUnique({
            where: {
                id,
            },
        });

        // CEK OLD PASSWORD is MATCH
        const { oldPassword, newPassword } = req.body;
        const passCompare = hashValidator(oldPassword, user.password);

        if (!passCompare) throw "Old Password not match";

        const newHashPassword = generateHash(newPassword);

        const updatedUser = await prisma.user.update({
            where: {
                id,
            },
            data: {
                password: newHashPassword,
                passwordUpdatedAt: new Date(Date.now() - 1000),
            },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });

        setCookie({
            res,
            title: "Authorization",
            data: generateAuthorizationToken({ id: updatedUser.id }),
        });

        return resSuccess({
            res,
            title: "Success update user password",
            data: updatedUser,
        });
    } catch (err) {
        return resError({
            res,
            title: "Failed to update user password",
            errors: err,
        });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const token = crypto.randomBytes(32).toString("hex");

        const secret = await prisma.user.update({
            where: { email },
            data: {
                token: crypto.createHash("sha256").update(token).digest("hex"),
                tokenExpiredAt: new Date(new Date().getTime() + 5 * 60000),
                tokenType: "RESET_TOKEN",
            },
        });

        const url = urlTokenGenerator(
            req,
            "api/v1/user/reset-password/",
            token
        );
        const subject = "Reset Password";
        const template = `<a href=${url}>${url}</a>`;
        await sendEmail(secret.email, subject, template);

        return resSuccess({
            res,
            title: "Success send reset link to your mail",
            data: [],
        });
    } catch (error) {
        return resError({ res, errors: error, title: "Failed reset email" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const { token } = req.query;
        const newPass = await prisma.user.update({
            where: {
                token: crypto.createHash("sha256").update(token).digest("hex"),
            },

            data: {
                password: generateHash(password),
                passwordUpdatedAt: new Date(Date.now() - 1000),
                token: null,
                tokenExpiredAt: null,
                tokenType: null,
            },
            select: {
                username: true,
                id: true,
                email: true,
            },
        });

        return resSuccess({
            res,
            title: "Success reset your password",
            data: newPass,
        });
    } catch (error) {
        console.log(error);
        return resError({ res, errors: error });
    }
};

exports.sendVerificationEmail = async (req, res) => {
    try {
        const token = crypto.randomBytes(32).toString("hex");
        const exp_time = 5;
        const secret = await prisma.user.update({
            where: { id: await getUser(req) },
            data: {
                token: crypto.createHash("sha256").update(token).digest("hex"),
                tokenExpiredAt: new Date(
                    new Date().getTime() + exp_time * 60000
                ),
                tokenType: "VERIFICATION_TOKEN",
            },
        });

        const subject = "Email Verification";
        const url = urlTokenGenerator(
            req,
            "api/v1/user/email-verification-process/",
            token
        );
        const template = `<a href=${url}>${url}</a>`;
        await sendEmail(secret.email, subject, template);

        return resSuccess({
            res,
            title: "We send verification url to your email",
            data: [],
        });
    } catch (error) {
        return resError({ res, errors: error, title: "Failed send email" });
    }
};

exports.verifyingEmail = async (req, res) => {
    const { token } = req.query;
    try {
        const data = await prisma.user.update({
            where: {
                token: crypto.createHash("sha256").update(token).digest("hex"),
            },
            data: {
                emailIsVerified: true,
                accountIsVerified: true,
                token: null,
                tokenExpiredAt: null,
                tokenType: null,
            },
            select: {
                id: true,
                username: true,
                emailIsVerified: true,
                accountIsVerified: true,
            },
        });

        return resSuccess({
            res,
            title: "Email successfully verified",
            data: data,
        });
        // return res.redirect("/profile");
    } catch (error) {
        console.log(error);
        return resError({
            res,
            errors: error,
            title: "Failed to verification email",
        });
    }
};

exports.list = async (req, res) => {
    try {
        const { search, cursor } = req.query;
        let userList;

        if (search) {
            if (!cursor) {
                userList = await prisma.user.findMany({
                    where: {
                        username: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    orderBy: {
                        username: "asc",
                    },
                    take: ITEM_LIMIT,
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        passwordUpdatedAt: true,
                        profil: { select: { full_name: true, photo: true } },
                        role: { select: { name: true } },
                    },
                });
            }

            if (cursor) {
                userList = await prisma.user.findMany({
                    where: {
                        username: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                    take: ITEM_LIMIT,
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        passwordUpdatedAt: true,
                        profil: { select: { full_name: true, photo: true } },
                        role: { select: { name: true } },
                    },
                });
            }
        }

        if (!search) {
            if (!cursor) {
                userList = await prisma.user.findMany({
                    orderBy: {
                        username: "asc",
                    },
                    take: ITEM_LIMIT,
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        passwordUpdatedAt: true,
                        profil: { select: { full_name: true, photo: true } },
                        role: { select: { name: true } },
                    },
                });
            }
            if (cursor) {
                userList = await prisma.user.findMany({
                    orderBy: {
                        username: "asc",
                    },
                    take: ITEM_LIMIT,
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        passwordUpdatedAt: true,
                        profil: { select: { full_name: true, photo: true } },
                        role: { select: { name: true } },
                    },
                });
            }
        }

        return resSuccess({
            res,
            title: "Success get user list",
            data: userList,
        });
    } catch (error) {
        return resError({
            res,
            title: "Cant get user list",
            errors: error,
        });
    }
};

exports.profileUpdate = async (req, res) => {
    try {
        const { email, full_name, username } = req.body;
        const id = await getUser(req);
        const currentData = await prisma.user.findUnique({
            where: { id },
        });

        // if user try change username
        if (username != currentData.username) {
            const checkUser = await prisma.user.findUnique({
                where: { username },
            });
            // if username already exist throw error
            if (checkUser) throw "User already exist or register";
        }

        // if user try change email
        if (email != currentData.email) {
            const checkUser = await prisma.user.findUnique({
                where: { email },
            });
            // if email already exist throw error
            if (checkUser) throw "Email already exist or register";
        }

        const emailChange = currentData.email !== email;

        const newData = await prisma.user.update({
            where: {
                id,
            },
            data: {
                username,
                email,
                emailIsVerified: currentData.email === email,
                profil: {
                    update: {
                        full_name,
                    },
                },
                updatedAt: new Date(Date.now() - 1000),
            },
            select: {
                id: true,
                username: true,
                email: true,
                emailIsVerified: true,
                profil: {
                    select: {
                        full_name: true,
                    },
                },
            },
        });

        if (emailChange) {
            const token = crypto.randomBytes(32).toString("hex");
            const exp_time = 5;
            const secret = await prisma.user.update({
                where: { id },
                data: {
                    token: crypto
                        .createHash("sha256")
                        .update(token)
                        .digest("hex"),
                    tokenExpiredAt: new Date(
                        new Date().getTime() + exp_time * 60000
                    ),
                    tokenType: "VERIFICATION_TOKEN",
                },
            });

            const url = urlTokenGenerator(
                req,
                "api/v1/user/email-verification-process/",
                token
            );

            const subject = "Email Verification";
            const template = `<a href=${url}>${url}</a>`;
            await sendEmail(secret.email, subject, template);
        }

        // Set New Cookie For User
        setCookie({
            res,
            title: "Authorization",
            data: generateAuthorizationToken({
                data: { userID: newData.id, username: newData.username },
            }),
        });

        return resSuccess({
            res,
            title: emailChange
                ? "Profile update, please verify your new email"
                : "Success update your profile",
            data: newData,
        });
    } catch (err) {
        console.log(err);
        return resError({ res, errors: err, title: "Failed update profile" });
    }
};
