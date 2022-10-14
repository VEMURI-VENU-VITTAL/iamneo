if(process.env.NODE_ENV!=="production"){
  require('dotenv').config();
}


const express=require("express");
const app=express();
const ejsMate=require("ejs-mate");
const path=require('path');
const methodOverride=require("method-override");
const mongoose=require("mongoose");
const axios=require('axios')
const User=require('./models/user');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const Auth=require('./models/authentication')
const session=require('express-session')
const flash=require('connect-flash');
const {isLoggedIn}=require('./middleware');
const multer=require('multer');
const {storage}=require('./cloudinary/app');
const upload=multer({storage})
const cloudinary=require('cloudinary').v2;
const streamifier=require('streamifier');
const ExpressError=require("./utils/ExpressError")
const catchAsync=require("./utils/catchAsync")
const helmet=require('helmet');


const MongoDBStore=require("connect-mongo")(session);


//process.env.DB_URL || 
//process.env.SECRET ||

const dbUrl= process.env.DB_URL || 'mongodb://localhost:27017/taskTwo';
const secret= process.env.SECRET || 'thisshouldbeabettersecret';


main().catch(err => console.log(err));
async function main() {
    await mongoose.connect(dbUrl)
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



app.use('/public',express.static('public'))

app.set('views',path.join(__dirname,'views'));
app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}))

const store = new MongoDBStore({
  url:dbUrl,
  secret,
  touchAfter:24*60*60

})

store.on("error",function(e){
  console.log('session store', e);
})

const sessionConfig={
    store,
    name:'session',
    secret,
    resave:false,
    saveUninitialized:true,
    cookie:{
      httpOnly:true,
      express:Date.now()+1000*60*60*24*7,
      maxAge:1000*60*60*24*7
    }
  }

  

app.use(session(sessionConfig))
app.use(flash())
app.use(passport.initialize());
app.use(passport.session())
passport.use(new LocalStrategy(Auth.authenticate()));
passport.serializeUser(Auth.serializeUser());
passport.deserializeUser(Auth.deserializeUser());

app.use(methodOverride('_method'));

app.use((req,res,next)=>{
    res.locals.currentUser=req.user;
    res.locals.success=req.flash("success");
    res.locals.error=req.flash('error');
    next();
})


  app.get('/random',async (req,res)=>{
    const user=await User.find();
    let num=Math.floor(Math.random()*user.length+1);
    let newuser=user[num];
    while(!newuser){
      num=Math.floor(Math.random()*1000+1);
      newuser=user[num];
    }
    res.render('home.ejs',{newuser});
    
  })

  app.get('/random/image',async(req,res)=>{
    const user=await User.find({gender:"male"});
    const fuser=await User.find({gender:"female"});
    res.render('image.ejs',{user,fuser});
  })
  app.get('/random/api',async(req,res)=>{
    if(req.query){
        if(req.query['gender']){
            const user=await User.find({gender:req.query['gender']})
            res.send(user);
        }
    }
    else{
        res.send("sorry, no data found");
    }
    
  })
  app.get('/random/new',isLoggedIn,(req,res)=>{
    
    res.render("new.ejs");
  })

  
  app.get('/random/image/:id',isLoggedIn,async (req,res)=>{
    const {id}=req.params;
    const user=await User.findById(id);
    res.render("show.ejs",{user});
  })

  
 
 

  app.post('/', upload.array(`image`), async (req,res)=>{
    
    const {name,email,dob,address,number,password,country,gender}=req.body;
    
    const nuser=new User({name,email,dob,address,number,password,country,gender});
    nuser.image=req.files.map(f=>({
      url:f.path,
      filename:f.filename
    }))
    
    nuser.author=req.user._id
    await nuser.save();
    //console.log(req.body);
    res.redirect(`/random/image/${nuser._id}`)
  })


  app.get('/random/image/:id/edit', isLoggedIn, async (req,res)=>{
    const {id}=req.params;
    const auth=await User.findById(id);
    if(!auth){
      req.flash('error','cannot find that user');
      return res.redirect(`/random`)
    }
    if(!auth.author.equals(req.user._id)){
      req.flash('error','you do not have permisstion to do that!');
      return res.redirect(`/random/image/${id}`)
    }
    //const user=await User.findById(id);
    res.render('edit.ejs',{auth});
  })

  app.put('/random/image/:id', isLoggedIn, upload.array('image'), async (req,res)=>{
    const {id}=req.params;
    const auth=await User.findById(id);
    if(!auth.author.equals(req.user._id)){
      req.flash('error','you do not have permission to do that!');
      return res.redirect(`/random/image/${id}`)
    }
    const {name,email,dob,address,number,password,country,gender}=req.body;
    const nuser=await User.findByIdAndUpdate(id,{name:name,email:email,dob:dob,address:address,number:number,password:password,country:country,gender:gender,image:[{url:req.files[0].path,filename:req.files[0].filename}]})
    req.flash('success','Successfully updated user details!')
    res.redirect(`/random/image/${id}`)
  })
  app.post('/random/search',async (req,res)=>{
    const {search}=req.body;
    let user=await User.find({name:search});
    console.log(user);
    if(user.length!=0){
        res.render('search.ejs',{user});
    }
    else{
        user=await User.find({email:search});
        if(user.length!=0){
            res.render('search.ejs',{user});
        }
        else{
            user=await User.find({dob:search});
            if(user.length!=0){
                res.render('search.ejs',{user});
            }
            else{
                user=await User.find({address:search});
                if(user.length!=0){
                    res.render('search.ejs',{user});
                }
                else{
                    user=await User.find({number:search});
                    if(user.length!=0){
                        res.render('search.ejs',{user});
                    }
                    else{
                        user=await User.find({country:search});
                        if(user.length!=0){
                            res.render('search.ejs',{user});
                        }
                        else{
                            user=await User.find({gender:search});
                            if(user.length!=0){
                                res.render('search.ejs',{user});
                            }
                            else{
                                
                                res.render('search.ejs',{user});
                            }
                        }
                    }
                }
            }
        }
    }
  })

  app.delete("/random/:id",async (req,res)=>{
    const {id}=req.params;
    await User.findByIdAndDelete(id);
    req.flash('success','successfully deleted user details!');
    res.redirect('/random');
  })

  app.get('/register',(req,res)=>{
    res.render('register.ejs')
  })

  app.post('/register',async (req,res)=>{
    try{
    const {email,username,password}=req.body;
    const auth=await new Auth({email,username});
    const registeredUser=await Auth.register(auth,password);
    req.login(registeredUser, err=>{
        if(err) return next(err);
        req.flash('success','successfully logged in!!')
        res.redirect('/random');
    })
    }
    catch(e){
        req.flash('error',e.message)
        res.redirect('/register');
    }
  })

  app.get('/login',(req,res)=>{
    res.render('login.ejs');
  })

  app.post('/login',passport.authenticate('local',{failureFlash:true, failureRedirect:'/login'}),(req,res)=>{
    req.flash('success','welcome back');
    const redirectUrl=req.session.returnTo || '/random';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  })

  app.get('/logout',(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success','logged out successfully');
        res.redirect('/random');
      });
    
  })

  app.all('*',(req,res,next)=>{
    next(new ExpressError('page not found',404))
  })
  
  app.use((err,req,res,next)=>{
    const {statusCode=500,message="something went wrong"}=err;
    res.status(statusCode).render('error.ejs',{err});
  })

  const port=process.env.PORT || 3000;
  app.listen(port, ()=>{
    console.log(`serving on port ${port}!`);
})