var express 		= require('express');
var app     		= express();
var mysql 			= require("mysql");
var bodyParser  = require('body-parser');
var http    		= require('http').Server(app);
var router  		= express.Router();

app.set('PORT', process.env.PORT || 9000 );
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(function(err, req, res, next) {
	res.header("Access-Control-Allow-Origin", "https://*.salesforce.com");
	res.header("Access-Control-Allow-Origin", "https://*.visual.force.com");
	next();
});

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

http.listen(app.get('PORT'),function(){
    console.log("Listening on port "+app.get('PORT'));
}); 