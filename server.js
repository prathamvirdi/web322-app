/*********************************************************************************
*  WEB322 – Assignment 04
*  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part 
*  of this assignment has been copied manually or electronically from any other source 
*  (including 3rd party web sites) or distributed to other students.
* 
*  Name: ______________________ Student ID: ______________ Date: ________________
*
*  Heroku App URL: ___________________________________________________________
* 
*  GitHub Repository URL: ______________________________________________________
*
********************************************************************************/ 

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');

const blog = require('./blog-service');
const app = express();




app.engine('.hbs', exphbs.engine({
    extname: '.hbs',
    helpers: {
        navLink: function (url, options) {
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function (context) {
            return stripJs(context);
        }
    }
}));
app.set('view engine', '.hbs');


cloudinary.config({
    cloud_name: 'bjpjerien',
    api_key: '999693617868597',
    api_secret: 'vTRdDIh-HJl6W-DPkSuaSG10XMI',
    secure: true
});

const upload = multer();


var path = require('path');
const { log } = require('console');
var views = path.join(__dirname, 'views');


blog.initialize().then(function () {
    app.listen(process.env.PORT || 8080, () => {
        console.log("Server Started at port 8080");
    })
}).catch(function (err) {
    console.log("unable to start server: " + err);
});


app.use(express.static('public'));

app.use(function (req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute = (route == "/") ? "/" : "/" + route.replace(/\/(.*)/, "");
    app.locals.viewingCategory = req.query.category;
    next();
});

app.get('/', (req, res) => {
    res.redirect('/blog');
});

app.get('/about', (req, res) => {
    res.render('about')
});

app.get('/posts/add', (req, res) => {
    res.render('addPost');
});

app.get('/posts', (req, res) => {
    if (req.query.category) {
        blog.getPostsByCategory(req.query.category).then((data) => {
            res.render('posts', {
                posts: data
            })
        }).catch((err) => {
            res.render("posts", { message: "No results" });
        })
    } else if (req.query.minDate) {
        blog.getPostsByMinDate(req.query.minDate).then((data) => {
            res.render('posts', {
                posts: data
            })
        }).catch((err) => {
            res.render("posts", { message: "No results" });
        })
    } else {
        blog.getAllPosts().then((data) => {
            res.render('posts', {
                posts: data
            })
        })
            .catch((err) => {
                res.render("posts", { message: "No results" });
            })
    }
})

app.get('/posts/:id', (req, res) => {
    blog.getPostsById(req.params.id).then((data) => {
        res.json(data)
    })
        .catch((err) => {
            res.json({
                message: "No results"
            });
        })
})


app.post('/posts/add', upload.single("featureImage"), (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream(
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };
        async function upload(req) {
            let result = await streamUpload(req);
            console.log(result);
            return result;
        }
        upload(req).then((uploaded) => {
            processPost(uploaded.url);
        });
    } else {
        processPost("");
    }

    function processPost(imageUrl) {
        req.body.featureImage = imageUrl;
        blog.addPost(req.body).then(() => {
            res.redirect('/posts');
        })
    }
})

app.get('/blog/:id', async (req, res) => {

    // Declare an object to store properties for the view
    let viewData = {};

    try {

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if (req.query.category) {
            // Obtain the published "posts" by category
            posts = await blog.getPublishedPostsByCategory(req.query.category);
        } else {
            // Obtain the published "posts"
            posts = await blog.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;

    } catch (err) {
        viewData.message = "no results";
    }

    try {
        // Obtain the post by "id"
        posts = await blog.getPostById(req.params.id);
        let post = posts[0];
        viewData.post = post;
    } catch (err) {
        viewData.message = "no results";
    }


    try {
        // Obtain the full list of "categories"
        let categories = await blog.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results"
    }
    console.log(viewData);

    // render the "blog" view with all of the data (viewData)
    res.render("blog", { data: viewData })
});

app.get('/blog', async (req, res) => {

    // Declare an object to store properties for the view
    let viewData = {};

    try {

        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if (req.query.category) {
            // Obtain the published "posts" by category
            posts = await blog.getPublishedPostsByCategory(req.query.category);
        } else {
            // Obtain the published "posts"
            posts = await blog.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

        // get the latest post from the front of the list (element 0)
        let post = posts[0];

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;
        viewData.post = post;

    } catch (err) {
        viewData.message = "no results";
    }

    try {
        // Obtain the full list of "categories"
        let categories = await blog.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results"
    }
    // render the "blog" view with all of the data (viewData)
    res.render("blog", { data: viewData })

});



app.get('/categories', (req, res) => {
    blog.getCategories().then((data) => {
        res.render('categories', {
            categories: data
        })
    })
        .catch((err) => {
            res.render('categories', {
                message: "No results"
            });
        })
})
app.use((req, res) => {
    res.status(404).render('404')
});