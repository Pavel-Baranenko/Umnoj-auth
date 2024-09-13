const config = require('config');
const formidable = require("formidable");

module.exports = (req, res, next) => {
    const filePath = config.get('staticPath');
    const form = formidable({ multiples: false, uploadDir: filePath, keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        req.body = fields;
        req.files = files;
        next();
    });
}