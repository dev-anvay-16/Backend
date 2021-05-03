const { validationResult } = require('express-validator');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require('../models/user');
const { Error } = require('mongoose');


exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation Failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    bcrypt.hash(password, 12).then(
        hashedPw => {
            const user = new User({
                email: email,
                password: hashedPw,
                name : name
            })
            return user.save();
        }
    ).then(
        result => {
            res.status(201).json({message : "user created" , userId: result._id})
        }
    ).catch(err => {
        if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
    })
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    User.findOne({ email: email }).then(
        user => {
            if (!user) {
                const error = new Error("User doesn't exist");
                error.statusCode = 401;
                throw error;
            }
            loadedUser = user;
            return bcrypt.compare(password, user.password);
        }
    ).then(
        passwordMatched => {
            if (!passwordMatched) {
                const error = new Error("Password Invalid");
                error.statusCode = 401;
                throw error;
            }
            const token = jwt.sign({
                email: loadedUser.email,
                userId: loadedUser._id.toString()
            }, 'Anvay-Wankhede', { expiresIn: '1h' });
            res.status(200).json({
                token: token,
                userId: loadedUser._id.toString()
            })
        }
    ).catch(err => {
         if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
    })
}


exports.getStatus = (req, res, next) => {
    User.findById(req.userId).then(
        user => {
            if (!user) {
                const error = new Error('No User Found');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({ messgae: "Fetched Status", status: user.status });
        }
    ).catch(
        err => {
           if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        }
    )
}

exports.updateStatus = (req, res, next) => {
    const newStatus = req.body.status;
    User.findById(req.userId).then(
        user => {
            if (!user) {
                const error = new Error('No User Found');
                error.statusCode = 404;
                throw error;
            }
           
            user.status = newStatus;
            return user.save();
        }
    ).then(result => {
        res.status(200).json({ messgae: "Update Status"  });
    })
        .catch(
        err => {
           if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        }
    )
}
