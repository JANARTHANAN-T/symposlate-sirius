const {userSchema,eventSchema} = require('./Schema')
const ExpressError = require('./utils/ExpressError');

// middleware for check for login user is accessing the routes

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error','You must login first')
        return res.redirect('/login');
    }
    next();
}

//middleware for check for the user is admin

module.exports.isAdmin = (req, res, next) => {
    if (req.user._id != process.env.ADMIN) {
        return res.redirect('/events')
    }
    next();
}

