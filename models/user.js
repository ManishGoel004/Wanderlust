const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default; 

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
//passport-local-mongoose will add a username and password automatically to every user so we need not add it separately
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);