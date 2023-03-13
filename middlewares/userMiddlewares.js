const { resError, ErrorException } = require("../services/responseHandler");
const prisma = require("../prisma/client");
const jwt = require("jsonwebtoken");
const {
    getAuthorizationToken,
    getUser,
    getResetUrlPayload,
    hashValidator,
} = require("../services/auth");
const crypto = require("crypto");
const loginRequired = async (req, res, next) => {
    const jwtToken = await getAuthorizationToken(req);
    try {
        // check if token exits
        if (!jwtToken)
            return resError({
                res,
                title: "Login Requires! Please Login",
                code: 401,
            });

        // find user
        const user = await prisma.user.findUnique({
            where: {
                id: jwtToken.userID,
            },
            select: {
                id: true,
                username: true,
                updatedAt: true,
            },
        });
        if (
            new Date(Number(jwtToken.iat * 1000)) <
            new Date(user.passwordUpdatedAt)
        )
            throw new ErrorException({
                type: "user",
                detail: "User password has changed, please relogin",
                location: "User authorization",
            });

        if (!user)
            throw new ErrorException({
                type: "user",
                detail: "Cant find the user",
                location: "User authorization",
            });

        if (user) return next();
    } catch (error) {
        return resError({
            res,
            title: "Cant find the user",
            errors: error,
            code: 401,
        });
    }
};

const logoutRequired = async (req, res, next) => {
    const jwtToken = await getAuthorizationToken(req);
    // check if token exits
    if (jwtToken)
        return resError({
            res,
            title: "Logout Requires! Please Logout First",
            code: 401,
        });

    next();
};

const allowedRole = (...roles) => {
    return async (req, res, next) => {
        const user = await prisma.user.findUnique({
            where: {
                id: await getUser(req),
            },
            select: {
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!roles.includes(user.role.name))
            return resError({
                res,
                title: `${user.role.name} not allow to perform this action`,
                code: 401,
            });

        if (roles.includes(user.role.name)) return next();
    };
};

const usernameIsExist = async (req, res, next) => {
    try {
        const { username } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                username,
            },
            select: {
                id: true,
                username: true,
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
                location: "Auth Midlleware",
            });

        return next();
    } catch (errors) {
        return resError({ res, title: "Something Wrong", errors, code: 401 });
    }
};

const usernameIsNotExist = async (req, res, next) => {
    try {
        const { username } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                username,
            },
            select: {
                id: true,
                username: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // give response if cant find the user
        if (user !== null)
            throw new ErrorException({
                type: "username",
                detail: "Username already exist",
                location: "Auth Midlleware",
            });

        return next();
    } catch (errors) {
        return resError({ res, title: "Something Wrong", errors, code: 401 });
    }
};

const emailIsExist = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
                username: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // give response if cant find the email
        if (user === null)
            throw new ErrorException({
                type: "email",
                detail: "Cant find the email",
                location: "Auth Midlleware",
            });

        return next();
    } catch (errors) {
        return resError({ res, title: "Something Wrong", errors, code: 401 });
    }
};

const emailIsNotExist = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
                username: true,
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // give response if cant find the user
        if (user !== null)
            throw new ErrorException({
                type: "username",
                detail: "Email already exist",
                location: "Auth Midlleware",
            });

        return next();
    } catch (errors) {
        return resError({ res, title: "Something Wrong", errors, code: 401 });
    }
};

const userIsNotVerify = async (req, res, next) => {
    try {
        const id = await getUser(req);
        const { accountIsVerified } = await prisma.user.findUnique({
            where: {
                id,
            },
            select: {
                accountIsVerified: true,
            },
        });
        if (accountIsVerified) throw "Your account already verified";
        return next();
    } catch (error) {
        return resError({
            res,
            errors: error,
            code: 401,
            title: "Cant execute request",
        });
    }
};

const userIsVerify = async (req, res, next) => {
    try {
        const { accountIsVerified } = await prisma.user.findUnique({
            where: { id: await getUser(req) },
            select: {
                accountIsVerified: true,
            },
        });
        if (!accountIsVerified) throw "Your account not verified";
        return next();
    } catch (error) {
        return resError({
            res,
            errors: error,
            code: 401,
            title: "Process failed",
        });
    }
};

/** Fungsi untuk mengecek apakah token masih aktif dan ada di database */
const tokenIsValid = async (req, res, next) => {
    const { token } = req.query;
    let user;
    const secret = crypto.createHash("sha256").update(token).digest("hex");
    try {
        user = await prisma.user.findUnique({ where: { token: secret } });
        if (user === null) throw "Token is not valid";
        if (new Date() > user.tokenExpiredAt) throw "Token is expired";
        return next();
    } catch (error) {
        if (error === "Token is expired") {
            await prisma.user.update({
                where: { id: user.id },
                data: { token: null, tokenExpiredAt: null },
            });
        }
        return resError({
            res,
            errors: error,
            title: "Token invalid",
        });
    }
};

const tokenTypeIs = (allowedTokenType) => {
    return async (req, res, next) => {
        try {
            const { token } = req.query;
            const secret = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");
            const { tokenType } = await prisma.user.findUnique({
                where: { token: secret },
                select: {
                    tokenType: true,
                },
            });
            if (tokenType !== allowedTokenType) throw "Wrong Token Type";

            return next();
        } catch (error) {
            return resError({
                res,
                errors: error,
                title: "Token invalid",
            });
        }
    };
};

module.exports = {
    loginRequired,
    logoutRequired,
    allowedRole,
    usernameIsExist,
    usernameIsNotExist,
    emailIsExist,
    emailIsNotExist,
    userIsNotVerify,
    userIsVerify,
    tokenIsValid,
    tokenTypeIs,
};
