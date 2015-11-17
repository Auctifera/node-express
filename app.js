var express = require('express');
var app     = express();
var mysql   = require("mysql");
var http    = require('http').Server(app);
var router  = express.Router();

/* Creating POOL MySQL connection.*/
var pool = mysql.createPool({
  connectionLimit   :   100,
  host              :   'aa1uwkiujokrxea.c1rmujjeq6cz.eu-west-1.rds.amazonaws.com',
  user              :   'admin',
  password          :   'NnZ-MWP-Mqq-3T7',
  database          :   'FundationCarmignacBD',
  debug             :   false
});

// Require Database router files.
var routes  = require( __dirname + "/app/routers/")(router,mysql,pool);

app.use('/',router);

http.listen(3000,function(){
    console.log("Listening on 3000");
}); 