const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reviewSchema = new Schema({
    userId : {type : Schema.Types.ObjectId, ref : "User"},
    comment: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 500
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
})

const Review = mongoose.model('Review', reviewSchema)
module.exports = Review
