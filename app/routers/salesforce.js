/*
app.js
-app
	-routers
		index.js
			post('/insert/')
			put('/update/')
			delete('/delete/')
		salesforce.js
			sf.insert/update
			sf.update
			sf.delete
			getOauth
		user.js
		home.js
	-views
		home.jade
*/

var crypto 			 = require('crypto');

exports.insert = function (req, res, pool) {

	//var records = req.query;
	var records = req.body;
	console.log('data: ',req.query);
	console.log('data2: ', req.body);
	console.log('data3: ', res.body);
	console.log('data4: ', res.query);

	var signature = records.Signature;
	var table = records.table;

	delete records.Signature;
	delete records.table;
	
	getOauth(signature, pool, function (err, connection) {
		if (err) {
			var response = {}
			
			response.errno = err.errno;
			response.error = err.message; 
			
			res.setHeader("mysql-response", err.errno);
			res.send(response);
			res.end();
		}
		if (connection) {
			var sqlQuery = "INSERT INTO "+table+" SET ?"+records+" ON DUPLICATE KEY UPDATE ?"+records;

			connection.query(sqlQuery, function (err, rows) {
				if (err) {
					var response = {}
			
					response.errno = err.errno;
					response.error = err.message; 
					
					res.setHeader("mysql-response", err.errno);
					res.send(response);
					res.end();
				}
				if (rows) {
					console.log("mysql-response", err.errno);
					console.log("error:", err);
					console.log("message:", rows);
					console.log(rows);
				}
			});
		}
		
	});

}

/*Get connection and oauth to RDS*/
function getOauth (signature, pool, callback) {

	var signatureArray 	= signature.split(".");
	var encodedEnvelope = signatureArray[0];
	var consumerSecret 	= signatureArray[1];
	
	pool.getConnection(function (err, connection){
		if (err) {
			err.message = "Error in database connection";
			callback(err, connection);
		}
		if (connection) {
			var sqlQuery = "SELECT Secret FROM Credentials__c";
			
			connection.query(sqlQuery, function (err, rows) {
				connection.release();

				if (err) {
					err.message = "Error in database query";
					callback(err, connection);
				}
				if (rows) {
					check = crypto.createHmac('SHA256', rows[0]['Secret']).update(encodedEnvelope).digest('base64')

		    	if ( check === consumerSecret ) {
		    		callback(false, connection);
	    		}else{
	    			err = {};
	    			err.errno = 401;
	    			err.message = "The connection was denied not authorized for remote RDS connection";
	    			err = false;
	    			callback(err, connection);
	    		}

				}
			});
		}
	});

}