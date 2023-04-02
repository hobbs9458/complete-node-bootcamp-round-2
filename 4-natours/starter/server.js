const mongoose = require('mongoose');
// dotenv CONFIG MUST COME BEFORE app IN CODE OR ELSE WE CANNOT LOG process.env.NODE_ENV in our app.js file. process.env gives access to the vars in our config.env file.
const dotenv = require('dotenv');

// global uncaught exception handler. needs to go at top of code. if you had an error that occured above this line it would not be caught.
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('unhandled exception. shutting down.');

  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// options passed in as second arg deals with deprecation warnings. Jonas doesn't really explain, he says to copy this into your projects. ???is it the same for mongoose versions beyond 5???
const connection = mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((connection) => {
    console.log('DB connected');
  });

// START SERVER
const port = 3000;
const server = app.listen(port, () =>
  console.log(`App running on port ${port}`)
);

// global unhandled promise rejection handler. e.g. a failed DB connection
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('unhandled rejection. shutting down.');
  // server.close() gives the app time to handle any pending requests before shutting down.
  server.close(() => {
    // args for process.exit(): 0 means success while 1 stands for uncaught exception
    process.exit(1);
    // in real world app we would need to restart the server after crashing it. some node hosting platforms do this automatically.
  });
});
