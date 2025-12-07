const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
    UserName: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("registration", registrationSchema);
