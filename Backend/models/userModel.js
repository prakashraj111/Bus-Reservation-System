const mongoose = require('mongoose');

const usernameStartsWithNumber = (value) => /^\d/.test(value);

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 60,
        validate: {
            validator: (value) => !usernameStartsWithNumber(value),
            message: "Username cannot start with a number"
        }
    },
    email: {type: String, unique: true, required: true, trim: true, lowercase: true},
    password: {
        type: String,
         required: true,
         minlength: 6
    },
    role: {
        type : String,
        enum : ["user","driver","admin"],
        default : "user",
    }
})

const User = mongoose.model('User', UserSchema)
module.exports = User
