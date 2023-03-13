const router = require("express").Router();
const controllers = require("./controllers");
const { body } = require("express-validator");
const {
    roleIDIsExist,
    roleNameIsExist,
} = require("../../middlewares/roleMiddlewares");
const {
    loginRequired,
    allowedRole,
    usernameIsExist,
} = require("../../middlewares/userMiddlewares");
const { formChacker } = require("../../middlewares/formMiddleware");

router.use(loginRequired, allowedRole("SUPER ADMIN"));
router
    .route("/")
    .get(controllers.list)
    .post(controllers.create)
    .patch(
        body("username").notEmpty().withMessage("Username is requires"),
        body("role").notEmpty().withMessage("Role is required"),
        formChacker,
        usernameIsExist,
        roleNameIsExist,
        controllers.setUserRole
    );
router
    .use(roleIDIsExist)
    .route("/:id")
    .get(controllers.detail)
    .patch(controllers.update)
    .delete(controllers.delete);

module.exports = router;
