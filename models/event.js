const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const eventSchema = new Schema({
    name:{
        type:String,
    },
    desc:{
        type: String,
    },
    url:{
        type: String,
    },
    date:{
          type:Date,
    },
    start:{
          type:String
    },
    end:{
        type:String
  }    
})

module.exports =new mongoose.model("Event",eventSchema);
