const mongoose=require('mongoose');
const Schema=mongoose.Schema;
const passportLocalMongoose=require('passport-local-mongoose');

const userSchema = new Schema({
    name:{
        type:String,
    },
    id:{
        type: String,
        unique:true
    },
    email:{
        type: String,
        unique:true
    },
    username:{
        type:String,
        unique:true
    }   ,
    calendar:[
        {
            type:Schema.Types.ObjectId,
            ref:'Event'
        }
    ]
})

userSchema.plugin(passportLocalMongoose)

module.exports = new mongoose.model("User",userSchema);
