const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, "uploads/venues");

    },

    filename(req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1e9) +
            path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

const upload = multer({

    storage,

    fileFilter(req, file, cb) {

        if (
            file.mimetype === "image/jpeg" ||
            file.mimetype === "image/png" ||
            file.mimetype === "image/jpg"
        ) {

            cb(null, true);

        } else {

            cb(new Error("Only JPG and PNG images are allowed"));

        }

    }

});

module.exports = upload;