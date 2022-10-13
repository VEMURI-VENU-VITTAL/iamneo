const mongoose=require("mongoose");

const Schema=mongoose.Schema;

const userSchema=new Schema({
    name: String,
    email:String,
    dob:String,
    address:String,
    number:String,
    password:String,
    country:String,
    gender:{
        type:String
    },
    image:[{
        url:String,
        filename: String
    }],
    author:{
        type:Schema.Types.ObjectId,
        ref:'Auth'
    }
})

module.exports=mongoose.model('User',userSchema);