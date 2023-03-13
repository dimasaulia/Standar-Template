const resError = ({
    res,
    title = "Failed execute task",
    errors,
    code = 500,
}) => {
    return res.status(code).json({
        success: false,
        message: title,
        errors,
    });
};

const resSuccess = ({
    res,
    title = "Successfully execute task",
    data,
    code = 200,
}) => {
    return res.status(code).json({
        success: true,
        message: title,
        data,
    });
};

function ErrorException({ type, detail, location = "not specified" }) {
    this[`${type}`] = { type, detail, location };
}

urlErrorHandler = (req, res, next) => {
    const data = {
        styles: ["/style/404.css"],
        scripts: [],
        layout: "auth.hbs",
        admin: process.env.PHONE_NUMBER,
    };
    res.status(404);
    return res.render("404", data);
};

module.exports = { resError, resSuccess, ErrorException, urlErrorHandler };
