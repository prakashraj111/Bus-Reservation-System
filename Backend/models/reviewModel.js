const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reviewSchema = new Schema({
    userId : {type : Schema.Types.ObjectId, ref : "User"},
    comment: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true
    }
})

const Review = mongoose.model('Review', reviewSchema)
module.exports = Review