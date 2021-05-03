const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path')



const Post = require('../models/post');
const User = require('../models/user');
const isAuth = require('../middleware/is-auth');



const clearImage = (filePath) => {
    console.log(filePath)
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, err => console.log(err));
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
    console.log("Status = ", req.body);
    User.findById(req.userId).then(
        user => {
            if (!user) {
                const error = new Error('No User Found');
                error.statusCode = 404;
                throw error;
            }
            console.log(user);
            user.status = newStatus;
            return user.save();
        }
    ).then(result => {
        res.status(200).json({ messgae: "Update Status" });
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

exports.getPosts = (req, res, next) => {
    let totalCount;
    const currentPage = req.query.page || 1;
    console.log(req.query.page)
    const perPage = 2;
    Post.find().countDocuments().then(
        count => {
            totalCount = count;
            return Post.find().populate('creator').skip((currentPage - 1) * perPage).limit(perPage);
        }
    ).then(
        posts => {
            
            res.status(200).json({message : 'Fetched Post Successfully', posts : posts , totalItems : totalCount})
        }
    )
    .catch(
        err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        }
    )
    
};

exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error( 'Validation failed, entered data is incorrect. ')
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('No image provided')
        error.statusCode = 422;
        throw error;
    }
    const imageUrl = req.file.path.replace("\\" ,"/");
    const title = req.body.title;
    const content = req.body.content;
    let creator;


    const post = new Post({
        title: title,
        content: content,
        creator: req.userId,
        imageUrl : imageUrl
    });
    post.save().then(
        results => {
            return User.findById(req.userId);
        }).then(user => {
            creator = user;
            user.posts.push(post);
            return user.save();
        }).then(result => {
            res.status(201).json({
                message: "Post Created Successfully!",
                post: post,
                creator : {_id : creator._id , name : creator.name}
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        });
}

exports.getPost = (req, res, next) => {
   const postId = req.params.postId;
    Post.findById(postId).populate('creator')
        .then(post => {
            if (!post) {
                const error = new Error('Could not find Post');
                error.statusCode = 404;
                throw err;
            }
            res.status(200).json({message : 'Post fetched' , post : post})
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
        })
}



exports.updatePost = (req, res, next) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error( 'Validation failed, entered data is incorrect. ')
        error.statusCode = 422;
        throw error;
    }
    // if (!req.file) {
    //     const error = new Error('No image provided')
    //     error.statusCode = 422;
    //     throw error;
    // }

    const postId = req.params.postId;
    let imageUrl = req.body.image;
    const title = req.body.title;
    const content = req.body.content;
    console.log(imageUrl,title,content)
    if (req.file) {
        imageUrl = req.file.path.replace("\\", "/");
    }
    console.log(imageUrl)
    if (!imageUrl) {
            const error = new Error('No File Picked');
            error.statusCode = 422;
            throw err;
    }
    Post.findById(postId).then(
        post => {
            if (!post) {
                const error = new Error('Could not find Post');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator.toString() !== req.userId) {
                const error = new Error('Not Authorized to update a post');
                error.statusCode = 403;
                throw error;
            }
            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl)
            }
            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;
            return post.save();
        }
    )
        .then(result => {
            res.status(200).json({message : "Post Updated" , post : result})
        })
        .catch(err => {
        if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err);
    })
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId).then(
        post => {
            if (!post) {
                const error = new Error('Could not find Post');
                error.statusCode = 404;
                throw err;
            }
            if (post.creator.toString() !== req.userId) {
                const error = new Error('Not Authorized to delete a post');
                error.statusCode = 403;
                throw error;
            }
            clearImage(post.imageUrl);
            return Post.findByIdAndRemove(postId);
            
        }
    ).then(result => {
        return User.findById(req.userId);
    }).then(user => {
        user.posts.pull(postId);
        return user.save();
    })
        .then(result => {
            res.status(200).json({ message: "Post Deleted" });
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
