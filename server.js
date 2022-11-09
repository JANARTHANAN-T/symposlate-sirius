if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

// imports
const express = require('express');
const path=require("path");
const mongoose=require("mongoose");
const methodOverride = require("method-override");
const ejsMate= require("ejs-mate");
const flash = require('connect-flash');
const session = require('express-session');
const { ppid } = require('process');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const MongoStore=require('connect-mongo');
const ExpressError= require('./utils/ExpressError');
const catchAsync = require('./utils/catchAsync');
const {isAdmin,isLoggedIn} = require('./middleware');
const Event=require("./models/event");
const User=require("./models/user");
const db=process.env.DB_URl;
const ADMIN=process.env.ADMIN;

// mongodb
mongoose.connect(db,{useNewUrlParser:true, useUnifiedTopology:true})
.then( () => {
    console.log("DB Connected");
}).catch(err => {
    console.log(err);
    console.log("DB Error");
})

//TTL
const store=new MongoStore({
    mongoUrl:db,
    secret:"it's secret",
    ttl:24*60*60
});

store.on('error',(e)=>{
    console.log("Store Error in session")
});


//session
const sessionConfig = {
    name: 'symposlate',
    secret:"it's secret",
    store, 
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

//middlewares
const app=express();
app.engine('ejs',ejsMate)
app.set("view engine",'ejs')
app.use(flash());
app.set('views',path.join(__dirname,'views'));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(methodOverride('_method'))
app.use(session(sessionConfig));
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
    res.locals.currentUser=req.user
    res.locals.error=req.flash('error');
    res.locals.success=req.flash('success');

    next();
})

//routes
//login and registration and logout
//login

app.get("/login",(req,res)=>{
    res.render("login");
})

app.post('/login',passport.authenticate('local',{failureFlash:true,failureRedirect:'/login'}),(req,res)=>{
    res.redirect('/events');
})

//Registration

app.post('/register',async(req,res)=>{
    try{
        const {name,id,email,username,password}=req.body;
        const user = new User({name,id,email,username});
        const newUser=await User.register(user,password);
        req.login(newUser,err =>{
            if(err) return next(err);
            return res.redirect('/events');
        })
        }catch(e){
            console.log(e.message);
            res.redirect('/login');
        }
})

//Logout 

app.get('/logout',(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
})

//Events - view add edit delete no-event
//View events

app.get("/events",isLoggedIn,async(req,res)=>{
    req.session.error=" "
    const events= await Event.find({});
    const id = req.user._id;
    const userEvents=await User.findById(id).populate('calendar')
    if(events.length==0) return res.redirect("/events/no");
    var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    var upcoming =[]
    var past=[]
    var register=[]
    var progress=[]
    let date= new Date()
    for(let ev of events){
        if(ev.date.toJSON().slice(0,10) > date.toJSON().slice(0,10)){
            upcoming.push(ev)
        }
        else if(ev.date.toJSON().slice(0,10) == date.toJSON().slice(0,10)){
            if(parseInt(ev.start.split(":")[0]) <= parseInt(date.getHours()) && parseInt(date.getHours()) < parseInt(ev.end.split(":")[0]) && parseInt(ev.start.split(":")[1]) <= parseInt(date.getMinutes())){
                progress.push(ev)
            }else{
                if(parseInt(ev.start.split(":")[0]) > parseInt(date.getHours()) && parseInt(ev.start.split(":")[1]) > parseInt(date.getMinutes())) {
                    upcoming.push(ev)
                }else{
                    past.push(ev)
                }               
            }
        }
        else{
            past.push(ev)
        }
    }
    for(let e of userEvents.calendar){
        register.push(e._id)
    }
    res.render("viewEvent",{upcoming,past,month,progress,register,ADMIN});
})

//Add events

app.get("/events/add",isLoggedIn,isAdmin,(req,res)=>{
    const errMsg=req.session.error
    res.render("addEvent",{errMsg});
})

app.post("/events/add",(req,res)=>{
    const event= req.body;
    const start=event.start;
    const end=event.end;
    if ( parseInt(start.split(":")[0]) > parseInt(end.split(":")[0]) || ( parseInt(start.split(":")[0])==parseInt(end.split(":")[0]) && parseInt(start.split(":")[1]) > parseInt(end.split(":")[1]) )){
        req.session.error = 'Please provide a valid zip.'
        return res.redirect("/events/add")
    }
    const events = new Event(req.body);
    events.save();
    res.redirect("/events");
})

//Edit events

app.get("/events/edit/:id",isLoggedIn,isAdmin,async(req,res)=>{
    const id=req.params.id;
    const event=await Event.findById(id)
    let date=event.date.toJSON().slice(0,10)
    const errMsg=req.session.error
    res.render("editEvent",{event,date,errMsg});
})

app.put('/events/edit/:id',async(req,res)=>{
    const {id}=req.params
    const {name,desc,url,date,start,end}=req.body;
    if ( parseInt(start.split(":")[0]) > parseInt(end.split(":")[0]) || ( parseInt(start.split(":")[0])==parseInt(end.split(":")[0]) && parseInt(start.split(":")[1]) > parseInt(end.split(":")[1]) )){
        req.session.error = 'Please provide a valid zip.'
        return res.redirect(`/events/edit/${id}`)
    }
    const event=await Event.findByIdAndUpdate(id,{name,desc,url,date,start,end})
    event.save()
    res.redirect('/events')

})

//Delete events

app.delete('/events/delete/:id',async(req,res)=>{
    const {id}=req.params
    const event=await Event.findByIdAndDelete(id)
    res.redirect('/events')

})

//No events

app.get("/events/no",isLoggedIn,(req,res)=>{
    res.render("emptyEvent",{ADMIN});
})

//Calendar - no-events view add delete
//No Calendar events

app.get("/calender/no",(req,res)=>{
    res.render("emptyCalender");
})

//View calendar events

app.get("/calender",isLoggedIn,async(req,res)=>{
    const id=req.user._id
    const userEvents=await User.findById(id).populate('calendar')
    if(userEvents.calendar.length==0){
        return res.redirect('calender/no')
    }
    let date=new Date()
    upcoming=[]
    past=[]
    progress=[]
    for(let ev of userEvents.calendar){
        if(ev.date.toJSON().slice(0,10) > date.toJSON().slice(0,10)){
            upcoming.push(ev)
        }
        else if(ev.date.toJSON().slice(0,10) == date.toJSON().slice(0,10)){
            if(parseInt(ev.start.split(":")[0]) <= parseInt(date.getHours()) && parseInt(date.getHours()) < parseInt(ev.end.split(":")[0]) && parseInt(ev.start.split(":")[1]) <= parseInt(date.getMinutes())){
                progress.push(ev)
            }else{
                if(parseInt(ev.start.split(":")[0]) > parseInt(date.getHours()) && parseInt(ev.start.split(":")[1]) > parseInt(date.getMinutes())) {
                    upcoming.push(ev)
                }else{
                    past.push(ev)
                }               
            }
        }
        else{
            past.push(ev)
        }
    }
    var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    res.render('viewCalender',{upcoming,past,progress,month})
})

//Add calendar events

app.get("/calender/add/:id",async(req,res)=>{
    const userId = req.user._id
    const { id } = req.params
    const user = await User.findById(userId).populate('calendar')
    let register = []
    for (let e of user.calendar) {
        let date = e.date
        let sTime = e.start.split(':')[0]
        let eTime = e.end.split(':')[0]
        let dict = { "date": date, "start": sTime, "end": eTime }
        register.push(dict)
    }
    let allow=true
    const event = await Event.findById(id)
    if (register.length) {
        for (let r of register) {
            if (event.date.getDate() == r["date"].getDate() && parseInt(event.start.split(":")[0]) >= parseInt(r["start"]) && parseInt(event.end.split(":")[0]) <= parseInt(r["end"])){
                allow=false;
                req.flash('success','Sorry, You cannot add this event. You have another event schedulted on this time');
                return res.redirect('/events')    
            }
        }
    }else {
        user.calendar.push(event)
    }
    if(allow){
        user.calendar.push(event)
    }
    user.save()
    res.redirect('/calender')
})

//Delete Calendar events

app.delete("/calender/delete/:id", async (req,res) =>{
    const {id}= req.params;
    const userId=req.user._id;
    const user = await User.findById(userId).populate('calendar')
    user.calendar.remove(id)
    user.save()
    res.redirect("/calender")
})

//Error Catching 404 500 status

app.all('*',(req,res,next) => {
    next(new ExpressError('Page Not Found',404))
})
app.use((err,req,res,next) => {
    const {statusCode=500} = err;
    if(!err.message) err.message='something went wrong';
    res.status(statusCode).render('error.ejs',{err});
})


//Serving port

const port =process.env.PORT || 4000
app.listen(port,()=>{
    console.log("Serving on port 4000")
})


