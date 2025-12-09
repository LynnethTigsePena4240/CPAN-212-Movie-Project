const express = require("express")
const app = express()
const path = require("path")
// Import the necessary dependency for the Mongoose ORM
const mongoose = require('mongoose')

// Import the Mongoose schemas (models) for our collections
const Movie = require("./models/movies");
const registration = require("./models/registration")

// Define the port the application will listen on
const PORT = process.env.PORT || 8000

require('dotenv').config();
//connection string for MongoDB cluster
const CONNECTION_STRING = process.env.MONGO_URI

// Configure the server to use EJS template engine for dynamic HTML rendering
app.set("view engine", "ejs")

// Set the directory where the EJS template files reside
app.set("views", path.join(__dirname, "views"))

// Serve static resources (CSS, images, client-side JS) from the 'public' folder
app.use(express.static(path.join(__dirname, "public")))

// Middleware to parse JSON payloads
app.use(express.json());
// Middleware to parse URL-encoded data from HTML forms
app.use(express.urlencoded({ extended: true }));

// Initialize and configure Express Session middleware for user tracking
const session = require("express-session");

app.use(session({
    secret: "yourSecretKey", // Required for signing the session ID cookie
    resave: false, // Prevents saving the session if it hasn't changed
    saveUninitialized: true // Forces an uninitialized session to be saved to the store
}));

// Custom middleware to make the session object available to all EJS templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Middleware function: Checks if any user is logged in
const isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        console.log("Access denied: Not logged in");
        return res.redirect("/login"); // Redirect to login if session.user is missing
    }
    // Proceed to the next middleware or route handler
    next();
};

// Middleware function: Checks if the logged-in user owns the specific movie document
const isOwner = async (req, res, next) => {
    if (!req.session.user) {
        console.log("Ownership check failed: Not logged in");
        return res.redirect("/login");
    }

    const { id } = req.params;

    try {
        // Fetch the movie document by its ID from the database
        const movie = await Movie.findById(id);

        if (!movie) {
            console.log(`Ownership check failed: Movie ID ${id} not found.`);
            return res.redirect("/movielist");
        }

        // Compare the 'postedBy' field (the owner's ID) with the current session user's ID
        if (movie.postedBy.toString() === req.session.user._id.toString()) {
            return next(); // User is the owner, grant access
        } else {
            console.log("Ownership check failed: User is not the owner.");
            return res.redirect("/movielist"); // User is not the owner, redirect
        }
    } catch (e) {
        console.error("Error during isOwner middleware:", e);
        return res.redirect("/movielist");
    }
};


// Default route (root path)
app.get("/", (req, res) => {
    // Redirect the root path to the main movie list page
    res.redirect("/movielist")
})

// GET route for displaying the "Add New Movie" form
// Uses 'isLoggedIn' middleware to protect the route
app.get("/insert", isLoggedIn, (req, res) => {
    return res.render("insert.ejs")
})


// POST route for handling the submission of the "Add New Movie" form
app.post("/insert", isLoggedIn, async (req, res) => {
    console.log(req.body)
    try {
        // Create a new Movie document object from the form data
        const movieToInsert = Movie(
            {
                movieName: req.body.movieName,
                movieDescript: req.body.movieDescript,
                year: req.body.year,
                genres: req.body.genres,
                rating: req.body.rating,
                // Link the movie to the current user ID for ownership tracking
                postedBy: req.session.user._id
            })
        console.log(movieToInsert)
        // Save the new movie document to the MongoDB collection
        await movieToInsert.save();
        res.redirect("/movielist");
    }
    catch (e) {
        console.log(e)
        res.redirect("/insert");
    }
})


// GET route to retrieve and display all movies
app.get('/movielist', async (req, res) => {
    try {
        console.log(`getting all movies`);
        // Fetch all movie documents from the database
        const movies = await Movie.find();

        // Render the EJS list template with the retrieved movie data
        return res.render("movielist.ejs", { movielist: movies })
    } catch (error) {
        res.status(500).send(error);
    }
});

// POST route for deleting a movie by ID
// Uses 'isOwner' middleware to ensure only the creator can delete it
app.post("/delete/:id", isOwner, async (req, res) => {
    try {
        const iddelete = req.params.id;
        // Find the document by ID and remove it from the database
        const deletedmovie = await Movie.findByIdAndDelete(iddelete)
        res.redirect("/movielist")
    }
    catch (e) {
        console.error("Error deleting movie:", e);
        res.redirect("/movielist");
    }
})

// GET route to show the update form, pre-filled with existing data
// Uses 'isOwner' middleware to protect access
app.get('/update/:id', isOwner, async (req, res) => {
    try {
        if (req.params.id) {
            // Retrieve the existing document by ID
            const movie = await Movie.findById(req.params.id);

            // Render the update page, passing the movie object for display
            res.render('update', { movie });
        } else {
            console.log(`No ID available`);
            res.redirect("/movielist");
        }

    } catch (error) {
        console.error("Error fetching movie:", error);
        res.status(500).send("Error fetching movie data");
    }
});

// POST route to receive and apply updated data to the database
// Uses 'isOwner' middleware to protect the write operation
app.post("/update/:id", isOwner, async (req, res) => {

    // Receive the document ID to update from the URL parameters
    const idToUpdate = req.params.id;

    if (idToUpdate) {
        console.log(`BookID to update : ${req.params.id}`)

        try {
            // Find the document by ID and update it with the new values from req.body
            const updatedMovie = await Movie.findByIdAndUpdate(
                idToUpdate,
                {
                    // List the fields to update
                    movieName: req.body.movieName,
                    movieDescript: req.body.movieDescript,
                    year: req.body.year,
                    genres: req.body.genres,
                    rating: req.body.rating
                },
                { new: true } // Option to return the updated document
            )

            // Check if a matching document was found and updated
            if (!updatedMovie) {
                return res.status(404).send("Movie not found");
            } else {
                console.log(`Successfully Updated : ${JSON.stringify(updatedMovie)}`);
            }

            // Redirect to movie list to show updated information
            res.redirect("/movielist")
        } catch (err) {
            console.log(`Unable to update movie : ${err}`);
            return res.send(err)
        }
    } else {
        console.log(`No matching object found`);
    }
})

// GET route for the user registration form
app.get("/registration", (req, res) => {
    return res.render("registration.ejs")
})

// POST route for handling user registration submission
app.post("/registration", async (req, res) => {
    console.log(req.body);

    try {
        // Basic validation, check if the two password fields match
        if (req.body.password !== req.body.confirmPassword) {
            return res.render("registration.ejs", {
                error: "Passwords do not match"
            });
        }

        // Create a new registration document with username and password
        const registrationForm = new registration({
            UserName: req.body.username,
            password: req.body.password
        });

        // Save the new user document to the database
        await registrationForm.save();
        // Redirect to the login page after successful registration
        res.redirect("/login");
    } catch (e) {
        console.log(e);
        res.render("registration.ejs", {
            error: "Error registering user"
        });
    }
});


// GET route for displaying the login form
app.get("/login", (req, res) => {
    console.log("opening login page");
    return res.render("login.ejs")
})


// POST route for handling user login submission
app.post("/login", async (req, res) => {
    // Attempt to find a user matching both the submitted username and password
    const user = await registration.findOne({
        UserName: req.body.username,
        password: req.body.password
    });

    if (!user) {
        // If no user is found, re-render the login page with an error message
        return res.render("login.ejs", {
            error: "Invalid username or password"
        });
    }

    // If User found, Store the user object in the session to mark them as logged in
    req.session.user = user;
    // Redirect to the main movie list page
    res.redirect("/movielist");

});

// POST route for user logout
app.post("/logout", (req, res) => {
    // Destroy the current session to log the user out
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        // Redirect to login page after session destruction
        res.redirect("/login");
    });
});


// Helper function to connect to MongoDB asychronously
const connectDB = async () => {
    try {
        console.log(`Attempting to connect to DB`);

        // Use mongoose.connect() to establish connection to MongoDB cluster
        mongoose.connect(CONNECTION_STRING)
            .then(() => console.log(`Database connection established successfully`))
            .catch((err) =>
                console.log(`Can't established database connection : ${JSON.stringify(err)}`))
    } catch (error) {
        console.log(`Unable to connect to DB : ${error.message}`);

    }
}

// Function executed when the server successfully starts listening
const onServerStart = () => {
    console.log(`The server started running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+c to stop`);

    // Start the database connection process
    connectDB()
}
// Start the Express server and listen on the specified port
app.listen(PORT, onServerStart)