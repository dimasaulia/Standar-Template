const router = require("express").Router();
const controller = require("./controlers");

router.get("/", controller.tes);

module.exports = router;
