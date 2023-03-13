const nodemailer = require("nodemailer");
const { urlEncrypter } = require("./auth");

/**
 * This function for sending email
 * @param {string} user_mail User email destination
 * @param {string} subject Subject for use
 * @param {string} template Template for use
 */
const sendEmail = async (user_mail, subject, template) => {
    let transporter = nodemailer.createTransport({
        host: process.env.MAIL_SERVER,
        port: Number(process.env.MAIL_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_USER, // generated ethereal user
            pass: process.env.MAIL_SECRET, // generated ethereal password
        },
    });

    let info = await transporter.sendMail({
        from: '"Template Service" <no-replay@templateservice.com>', // sender address
        to: user_mail, // list of receivers
        subject,
        html: template,
    });
};

const urlTokenGenerator = (req, endpoint, token) => {
    let finalUrl = `${req.protocol}://${req.get(
        "host"
    )}/${endpoint}?token=${token}`;
    return finalUrl;
};

module.exports = { sendEmail, urlTokenGenerator };
