const mongoose = require('mongoose')

const movieSchema = new mongoose.Schema(
    {
        movieName:{
            type: String,
            required: true
        },
        movieDescript:{
            type: String,
            required: true
        },
        
        year:{
            type: Number,
            required: true
        },
        genres:{
            type: String,
            required: true
        },
        rating:{
            type: Number,
            required: true
        }
    })


const Movie = mongoose.model("Movie", movieSchema);
//students lower case plural colection in mongodb
//insert document
//interface for crud with monngodb
module.exports=Movie;
    
