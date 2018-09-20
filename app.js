const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require('multer');
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOveride = require("method-override");
const bodyParser = require('body-parser');




// Middleware
app.use(bodyParser.json());
app.use(methodOveride('_method'));

// Set view for ejs 
app.set('view engine', 'ejs');




// Mongo Database URI
const mongoURI = 'mongodb://admin:olie7991!@ds163402.mlab.com:63402/mongouploads';

// Create Mongo Connection
const conn = mongoose.createConnection(mongoURI);

// Init Gridfs-Stream
let gfs;

conn.once('open', () => {
    // Init Stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
});

// Create Storage engine - Powered by multer-gridfs-storage
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });





// Seting index.html as root page
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if (
                    file.contentType === 'image/jpeg' ||
                    file.contentType === 'image/png'
                ) {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files });
        }
    });
});

// Post Route '/upload' - Uploads file to Database
app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({ file:req.file });
    res.redirect('/')
})

// Route Get /files -  display all files from JSON - using 'gridfs-stream'
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files 
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }
        // File exists
        return res.json(files);
    });
});

// Route Get /files/:filename -  display singular file - using 'gridfs-stream'
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // check if files 
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exist'
            });
        }
        // file exists

        return res.json(file);
    })
});

// Route Get /image/:filename -  display singular file - using 'gridfs-stream createReadStream'
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }

        // Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            });
        }
    });
});


// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err });
        }

        res.redirect('/');
    });
});
/////////////////////////////////////////////// Setting localhost:5000 //////////////////////////////////////////////////////////////////////////////////////////////
const port = 5000;
app.listen(port, () => console.log(`Server started on Port: ${port}`));
