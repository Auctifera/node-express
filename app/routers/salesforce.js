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

	var record = req.body;
	console.log('define record: ',record);

	var signature = record.Signature;
	var table = record.table;

	delete record.Signature;
	delete record.table;
	
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

			console.log('record resul: ', record);

			var nameField = Object.keys(record);
			var valueField = Object.keys(record).map(function (val) {
				return record[val];
			});

			console.log('name Field: ', nameField);
			console.log('value Field: ', valueField);

			var updateFields = "";
			var nameFields = "";
			var valueFields = "";

			for (var i = nameField.length - 1; i >= 0; i--) {

				nameFields += "`"+nameField[i]+"`";
				valueFields += "'"+valueField[i]+"'";
				updateFields += "`"+nameField[i]+"` = '"+valueField[i]+"'";
				
				if (i > 0) {
					nameFields += ',';
					valueFields += ',';
					updateFields += ',';
				}

			}

			console.log('name record: ', nameFields);
			console.log('update record: ', updateFields);

			var sqlQuery = "INSERT INTO `"+table+"` ("+nameFields+") VALUES("+valueFields+") ON DUPLICATE KEY UPDATE "+updateFields;

			console.log('query: ', sqlQuery);
			connection.query(sqlQuery, function (err, rows) {
				var response = {}
			
				if (err) {
					response.errno = err.errno;
					response.error = err.message; 
					
					res.setHeader("mysql-response", err.errno);
					res.send(response);
					res.end();
				}
				if (rows) {
					response.Id 	 = rows.insertId;
					response.IdSF  = record.IdSF;
					response.table = table;

					res.setHeader("mysql-response", rows.serverStatus);
					res.send(response);
					res.end();
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