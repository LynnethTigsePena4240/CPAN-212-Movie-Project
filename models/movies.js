const mongoose = require('mongoose')

const movieSchema = new mongoose.Schema(
    {
        movieName: {
            type: String,
            required: true
        },
        movieDescript: {
            type: String,
            required: true
        },

        year: {
            type: Number,
            required: true
        },
        genres: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    }
)


const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;