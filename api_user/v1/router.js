const router = require("express").Router();
const { body, query } = require("express-validator");
const { formChacker } = require("../../middlewares/formMiddleware");
const {
    loginRequired,
    logoutRequired,
    usernameIsNotExist,
    emailIsNotExist,
    emailIsExist,
    userIsNotVerify,
    allowedRole,
    tokenIsValid,
    tokenTypeIs,
} = require("../../middlewares/userMiddlewares");
const controllers = require("./controllers");

router.post(
    "/register",
    logoutRequired,
    body("username")
        .isLength({ min: 6 })
        .withMessage("Username minimum 6 character"),
    body("email").isEmail().withMessage("Please enter valid email"),
    body("password")
        .isStrongPassword()
        .withMessage(
            "Password must have at least 8 characters, have a combination of numbers, uppercase, lowercase letters and unique characters"
        ),
    formChacker,
    usernameIsNotExist,
    emailIsNotExist,
    controllers.register
);
router.post("/login", logoutRequired, controllers.login);
router.get("/logout", loginRequired, controllers.logout);
router.get(
    "/list",
    loginRequired,
    allowedRole("SUPER ADMIN"),
    controllers.list
);
router.post(
    "/forgot-password",
    logoutRequired,
    body("email").isEmail(),
    formChacker,
    emailIsExist,
    controllers.forgotPassword
);
router.post(
    "/reset-password",
    logoutRequired,
    query("token").notEmpty(),
    body("password").notEmpty(),
    formChacker,
    tokenIsValid,
    tokenTypeIs("RESET_TOKEN"),
    controllers.resetPassword
);
router.post(
    "/send-verification-link/",
    loginRequired,
    userIsNotVerify,
    controllers.sendVerificationEmail
);

router.get(
    "/email-verification-process/",
    query("token").notEmpty().withMessage("Your token is missing"),
    formChacker,
    tokenIsValid,
    tokenTypeIs("VERIFICATION_TOKEN"),
    controllers.verifyingEmail
);

router
    .use(loginRequired)
    .route("/")
    .get(controllers.detail)
    .patch(
        body("oldPassword").notEmpty(),
        body("newPassword").isStrongPassword(),
        formChacker,
        controllers.updatePassword
    );

router.post(
    "/update/profile",
    loginRequired,
    body("username")
        .notEmpty()
        .isLength({ min: 3 })
        .withMessage("Username minimal 3 character")
        .not()
        .contains(" ")
        .withMessage("Username can't contain space"),
    body("email").notEmpty().isEmail().withMessage("Email required"),
    body("full_name").notEmpty().withMessage("Full name required"),
    formChacker,
    controllers.profileUpdate
);

module.exports = router;
