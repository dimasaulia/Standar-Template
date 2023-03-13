const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");
const saltRounds = 12;
const { random: stringGenerator } = require("@supercharge/strings");

/**
 * Function to hash input number or string.
 * @param {string} text Input string to hash.
 * */
const generateHash = (text) => {
    const hashPassword = bcrypt.hashSync(text, bcrypt.genSaltSync(saltRounds));
    return hashPassword;
};

/**
 * Funstion to check hash text with the original plain text, wil return boolean.
 * @param {string} password Plain text to check
 * @param {string} hashPassword Hash text to validate the plain text
 * @returns {boolean} return boolean value
 */
const hashValidator = (password, hashPassword) => {
    const isTruePassword = bcrypt.compareSync(password, hashPassword);
    return isTruePassword;
};

/** Set Cookie To User Browser */
const setCookie = ({
    res,
    title,
    data,
    maxAge = (Number(process.env.MAX_AGE) || 259200) * 1000,
}) => {
    res.cookie(title, data, { httpOnly: true, maxAge });
};

/** Creating jwt token*/
const generateAuthorizationToken = ({
    data,
    exp = Number(process.env.MAX_AGE) || 259200,
}) => {
    return jwt.sign(data, process.env.SECRET, {
        expiresIn: exp,
    });
};

/**  Getting jwt token from request */
const getAuthorizationToken = async (req) => {
    try {
        const jwtToken = req.cookies.Authorization;
        const id = await jwt.verify(
            jwtToken,
            process.env.SECRET,
            async (err, decode) => {
                if (!err) {
                    return decode;
                } else {
                    throw "Failed to verify token";
                }
            }
        );
        return id;
    } catch (error) {
        return false;
    }
};

/** Get uuid from req */
const getUser = async (req) => {
    const { userID } = await getAuthorizationToken(req);
    return userID;
};

const generateResetUrl = (token, id) => {
    const salt = stringGenerator(20);
    const uuidArray = id.split("-");
    const secret =
        salt.slice(0, 15) +
        uuidArray[0] +
        token.slice(0, 17) +
        uuidArray[1] +
        token.slice(17, 33) +
        uuidArray[2] +
        token.slice(33, 49) +
        uuidArray[3] +
        token.slice(49, 65) +
        uuidArray[4] +
        salt.slice(15, 30);
    return secret;
};

const getResetUrlPayload = (payload) => {
    try {
        const token =
            payload.slice(23, 40) +
            payload.slice(44, 60) +
            payload.slice(64, 80) +
            payload.slice(84, 99);

        if (!token) throw "Failed to get payload";

        const uuid =
            payload.slice(15, 23) +
            "-" +
            payload.slice(40, 44) +
            "-" +
            payload.slice(60, 64) +
            "-" +
            payload.slice(80, 84) +
            "-" +
            payload.slice(99, 111);
        if (uuid === "----" || uuid == null || uuid == undefined)
            throw "Failed to get payload";
        return { token, uuid };
    } catch (error) {
        return false;
    }
};

module.exports = {
    generateHash,
    hashValidator,
    generateAuthorizationToken,
    setCookie,
    getAuthorizationToken,
    getUser,
    generateResetUrl,
    getResetUrlPayload,
};
