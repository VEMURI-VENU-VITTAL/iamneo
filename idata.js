const mongoose=require("mongoose");
const User=require('./models/user');
const axios=require('axios')

main().catch(err => console.log(err));
async function main() {
    await mongoose.connect('mongodb://localhost:27017/taskTwo')
    .then(()=>{
      console.log("connection open");
      useNewUrlParser:true;
      useCreateIndex:true;
      useUnifiedTopology:true;
      useFindAndModify:false;
      
    })
    .catch(err=>{
      console.log("oh no error!!");
      console.log(err);
    })
  
    console.log("connected");
    
    // use `await mongoose.connect('mongodb://user:password@localhost:27017/test');` if your database has auth enabled
  }
  const dataapi=async function(){
    const res=await axios.get(`https://randomuser.me/api/?results=5000`);
    const {results}=res.data;
    for(let i of results){
      const gender=i.gender;
      const name=i.name.first+" "+i.name.last;
      const address=i.location.number+i.location.name;
      const country=i.location.country;
      const email=i.email;
      const password=i.login.password;
      const dob=i.dob.date.slice(0,10);
      const number=i.phone;
      const imageurl=i.picture.large;
      const imagefolder='Random/fv4a2gcykdt622pewpwc';
      const user=await new User({author:"634599a84879320187e09728",name:name,email:email,dob:dob, address:address,number:number, password:password,country:country,gender:gender,image:[{url:imageurl,filename:imagefolder}]})
      await user.save();

    }
  
  }
dataapi();