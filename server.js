const express = require("express")
const app = express()
const path = require("path")
//import the dependency for mongoose library
const mongoose = require('mongoose')

const Movie = require("./models/movies");
//const registration = require("./models/registration")

const PORT = process.env.PORT || 8000

//connection string for MongoDB cluster
const CONNECTION_STRING = `mongodb+srv://dbUser:dbUser@cluster0.g7jtlyr.mongodb.net/?appName=Cluster0`

//configure the server to use EJS template engine
app.set("view engine", "ejs")

//set the views directory for template engine views
app.set("views", path.join(__dirname, "views"))

//set the static resource folder (public) using static middleware
app.use(express.static(path.join(__dirname, "public")))

// Middleware to parse JSON and URL-encoded data
app.use(express.json()); // For parsing JSON
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded data from forms

const session = require("express-session");

app.use(session({
    secret: "yourSecretKey", // change this to a strong secret
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});


//req.body
app.get("/", (req,res) => {
    // serve the EJS template movielist.ejs as default page
    res.redirect("/movielist")
})

app.get("/insert", (req,res) => {
  return res.render("insert.ejs")
})


//recive data from html form and save in mongodb
//async, await operation
app.post("/insert",async (req,res)=>{
    console.log(req.body)
    try{
        const movieToInsert = Movie(
            {
                movieName: req.body.movieName,
                movieDescript: req.body.movieDescript,
                year:req.body.year,
                genres: req.body.genres,
                rating: req.body.rating
             })
             console.log(movieToInsert)
             //mongodb insert document collection
             await movieToInsert.save();
             res.redirect("/movielist");
    }
    catch(e){
        console.log(e)
    }
})


//route to get all movies
app.get('/movielist', async (req, res) => {
    try {
        console.log(`getting all movies`);
        const movies = await Movie.find();

        return res.render("movielist.ejs",{movielist:movies})
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/delete/:id", async(req,res)=>{
    try{
        const iddelete = req.params.id;
        const deletedmovie = await Movie.findByIdAndDelete(iddelete)
        res.redirect("/movielist")
    }
    catch(e)
    {

    }
})

//GET endpoint to show update page with existing data
app.get('/update/:id', async (req, res) => {
   try {
       if (req.params.id){
           //retrieve existing document by id
           const movie = await Movie.findById(req.params.id);


           //re-render the update page to show existing data on HTML Form
           res.render('update', { movie });
       }else{
           console.log(`No ID available`);
          
       }

   } catch (error) {
     console.error("Error fetching movie:", error);
     res.status(500).send("Error fetching movie data");
   }
});

//POST endpoint to receive updated data and save it to database
app.post("/update/:id", async (req,res)=>{

   //receive the document ID to update
   const idToUpdate = req.params.id;
  
   if (idToUpdate){
       console.log(`BookID to update : ${req.params.id}`)

       try {
           // updates the document with the values provided in the form
           const updatedMovie = await Movie.findByIdAndUpdate(
               idToUpdate,
               {
                   //list the fields to update
                   movieName: req.body.movieName,
                   movieDescript: req.body.movieDescript,
                   year: req.body.year,
                   genres: req.body.genres,
                   rating: req.body.rating
               },
               {new:true}
           )

           //check if matching document is found
           if (!updatedMovie) {
               return res.status(404).send("Movie not found");
           }else{
               console.log(`Successfully Updated : ${JSON.stringify(updatedMovie)}`);
           }

           //redirect to  movie list to show updated information
           res.redirect("/movielist")
       } catch(err) {
           console.log(`Unable to update movie : ${err}`);
           return res.send(err)
       }   
   }else{
       console.log(`No matching object found`);
   }
})

const registration = require("./models/registration")

// route for registration 
app.get("/registration", (req,res) => {
  return res.render("registration.ejs")
})

app.post("/registration", async (req, res) => {
    console.log(req.body);

    try {
        if (req.body.password !== req.body.confirmPassword) {
            return res.render("registration.ejs", {
                error: "Passwords do not match"
            });
        }

        const registrationForm = new registration({
            UserName: req.body.username,
            password: req.body.password
        });

        await registrationForm.save();
        res.redirect("/login");
    } catch (e) {
        console.log(e);
        res.render("registration.ejs", {
            error: "Error registering user"
        });
    }
});


// route for login 
app.get("/login", (req,res) => {
    console.log("opening login page");
    return res.render("login.ejs")
})


app.post("/login", async (req, res) => {
    const user = await registration.findOne({
        UserName: req.body.username,
        password: req.body.password
    });

    if (!user) {
        return res.render("login.ejs", {
            error: "Invalid username or password"
        });
    }

    req.session.user = user;
    res.redirect("/movielist");

});

// logout 
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.redirect("/login");
    });
});





//helper function to connect to MongoDB asychronously
const connectDB = async() => {
    try{
        console.log(`Attempting to connect to DB`);

        //use mongoose.connect() function to establish connection to MongoDB cluster
        mongoose.connect(CONNECTION_STRING)
        .then(() => console.log(`Database connection established successfully.`))
        .catch( (err) => 
            console.log(`Can't established database connection : ${JSON.stringify(err)}`))
    }catch(error){
        console.log(`Unable to connect to DB : ${error.message}`);
        
    }
}

const onServerStart = () => {
    console.log(`The server started running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+c to stop`);

    //connect to database
    connectDB()
}
app.listen(PORT, onServerStart)
 