const multer = require("multer")
const path = require("path");

const allowedFileTypes = ["image/png", "image/jpg", "image/jpeg"];

const storage = multer.diskStorage({
    destination : function(req,file,cb){
        cb(null,'./uploads') // cb(error,success) // cb(euta matra argument)
    },
    filename : function(req,file,cb){
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-");
        cb(null,Date.now() + "-" + safeName)
    }
})

module.exports = {
    multer,
    storage,
    uploadConfig: {
        storage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: function (req, file, cb) {
            const extension = path.extname(file.originalname || "").toLowerCase();
            if (!allowedFileTypes.includes(file.mimetype) || ![".png", ".jpg", ".jpeg"].includes(extension)) {
                cb(new Error("Only PNG and JPG/JPEG image files up to 5MB are allowed"));
                return;
            }
            cb(null, true);
        }
    }
}
