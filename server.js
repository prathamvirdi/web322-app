var express = require("express");
var fs = require('fs');
var path = require('path');
var app = express();
var blog = require('./blog-service.js')
const multer = require("multer");
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')
const upload = multer(); 

var HTTP_PORT = process.env.PORT || 8080;


function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
}
app.use(express.static('public'));



cloudinary.config({
  cloud_name: 'don6p0dkg',
  api_key: '465627321558977',
  api_secret: 'z8N02lFW2Xjciga2lckb5M2up_Y',
  secure: true
});
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/views/about.html'));
});

  app.get('/about', function(req, res) {
    res.sendFile(path.join(__dirname, '/views/about.html'));
  });
  app.get('/blog', function(req, res) {
    blog.getPublishedPosts().then((data) =>
    {
        res.json({data});
    }).catch((err) => {
        res.json({message: err});
    })
  });
  app.get('/posts', function(req, res) {
    res.sendFile(path.join(__dirname, '/data/posts.json'));
  
  });
  app.get('/categories', function(req, res) {
    res.sendFile(path.join(__dirname, '/data/categories.json'));
  });
  app.get('/posts/add', function(req, res) {
    res.sendFile(path.join(__dirname, '/views/addPost.html'));
  });
  app.get('*', function(req, res){
    res.send("404 Page not found");
  });
  app.post('/posts/add',  upload.single("featureImage"), (req,res) => {
    let streamUpload = (req) => {
        return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
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
    upload(req).then((uploaded)=>{
        req.body.featureImage = uploaded.url;

        // TODO: Process the req.body and add it as a new Blog Post before redirecting to /posts
        blog.addPost(req.body)
                .then(() => {
                res.redirect("/posts");
        });
    });
});
  blog.initialize().then(() => 
{
    app.listen(HTTP_PORT, onHttpStart());
}).catch (() => {
    console.log("ERROR : From starting the server");
});
