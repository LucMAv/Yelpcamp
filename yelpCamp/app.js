if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
};

const express = require('express');
const app = express();
const path = require('path');
const ejsMate = (require('ejs-mate'));
const session = require('express-session');
const flash = require('connect-flash');
const Joi = require('joi');
const { campgroundSchema, reviewSchema } = require('./schemas.js');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const Campground = require('./models/campground');
const morgan = require('morgan');
const Review = require('./models/review');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user')
const bodyParser = require('body-parser');
const userRoutes = require('./routes/users')
const campgrounds = require('./routes/campgrounds');
const reviews = require('./routes/reviews');
const helmet = require('helmet');
const MongoDBStore = require('connect-mongo');


// Node events emitter
const { getEventListeners, EventEmitter } = require('node:events');

{
  const ee = new EventEmitter();
  const listener = () => console.log('Events are fun');
  ee.on('foo', listener);
  getEventListeners(ee, 'foo'); // [listener]
}
{
  const et = new EventTarget();
  const listener = () => console.log('Events are fun');
  et.addEventListener('foo', listener);
  getEventListeners(et, 'foo'); // [listener]
}

// Requiring Mongoose - START MONGO off of mongoose docs
const mongoose = require('mongoose');
const { urlencoded } = require('express');
const ExpressMongoSanitize = require('express-mongo-sanitize');


main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/yelp-camp');
  console.log('la connexion de mongo est ouvert');
};

// Setting up views dir for EJS
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// parse the post request (new campgrounds)
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Stopping mongo exploitations
app.use(ExpressMongoSanitize());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// sessions and cookie config
const sessionConfig = {
    name: 'session:_id:',
    secret: 'thisshouldbeabettersecret!', 
    resave: false, 
    saveUninitialized: true, 
    cookie: {
        httpOnly: true, /// OWASP to prevent XSS
        // secure: true, 
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // in ms this makes it a week
        maxAge: 1000 * 60 * 60 * 27 * 7
    }
}
// cookies and sessions
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com",
    "https://api.tiles.mapbox.com",
    "https://api.mapbox.com",
    "https://kit.fontawesome.com",
    "https://cdnjs.cloudflare.com",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com",
    "https://stackpath.bootstrapcdn.com",
    "https://api.mapbox.com",
    "https://api.tiles.mapbox.com",
    "https://fonts.googleapis.com",
    "https://use.fontawesome.com",
];
const connectSrcUrls = [
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://events.mapbox.com",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dx8kuyskp/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


// Passport authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// // Hardcoding a user
// app.get('/fakeUser', async(req, res) => {
//     const user = new User ({ email: 'colt@gmail.com', username: 'colt'});
//     const newUser = await User.register(user, 'chicken');
//     res.send(newUser);
// });

// Register form


// Middleware msg / flash
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error')
    next();
});

// Router paths
app.use('/', userRoutes);
app.use("/campgrounds", campgrounds);
app.use('/campgrounds/:id/reviews', reviews);

// / homepage
app.get('/', (req, res) => {
    res.render('home');
});

// Hardcoding an initial campground
// app.get('/makecampground', async (req, res) => {
//     const camp = new Campground({ title: 'My Backyard', description: 'Cheap camping'});
//     await camp.save();
//     res.send(camp)
// });

// 404 request
app.all('*', (req, res, next) => {
    next(new ExpressError("Page Not Found", 404));
})

// Basic Error Handler
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Oh No, Something Went Wrong!"
    res.status(statusCode).render('error', { err });
});

// node listening through
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})