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
exports.insertRecord = function (req, res, pool) {

	var record = req.body;
	record.IdSF = record.Id;
	console.log('define record: ',record);

	var signature = record.Signature;
	var table = record.table;
	
	if (record.attributes !== undefined) {
		table = record.attributes.type;
	}
	
	delete record.Signature;
	delete record.table;
	delete record.Id;

	getOauth(signature, pool, function (err, connection) {
		var response = {}

		console.log('getOauth', err);
			
		if (err) {
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

			var nameFields = "";
			var valueFields = "";

			for (var i = nameField.length - 1; i >= 0; i--) {

				nameFields += "`"+nameField[i]+"`";
				valueFields += "'"+valueField[i]+"'";
				
				if (i > 0) {
					nameFields += ',';
					valueFields += ',';
				}

			}

			console.log('name record: ', nameFields);
			
			var sqlQuery = "INSERT INTO `"+table+"` ("+nameFields+") VALUES("+valueFields+") ON DUPLICATE KEY UPDATE ?";

			console.log('query: ', sqlQuery);
			connection.query(sqlQuery, record, function (err, rows) {
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

exports.updateRecord = function (req, res, pool) {
	var record = req.body;
	console.log('define record: ',record);

	var signature = record.Signature;
	var table = record.table;
	var IdSF = record.Id

	delete record.Signature;
	delete record.table;
	delete record.Id;
	
	getOauth(signature, pool, function (err, connection) {
		var response = {}

		if (err) {
			response.errno = err.errno;
			response.error = err.message; 
			
			res.setHeader("mysql-response", err.errno);
			res.send(response);
			res.end();
		}
		if (connection) {

			var sqlQuery = "UPDATE "+table+" SET ? WHERE IdSF = '"+IdSF+"'";

			connection.query(sqlQuery,record, function (err, rows) {
				if (err) {
					response.errno = err.errno;
					response.error = err.message; 
					
					res.setHeader("mysql-response", err.errno);
					res.send(response);
					res.end();
				}
				if (rows) {

					console.log(rows);

					response.message 	 = rows.message;
					response.changedRows  = rows.changedRows;

					res.setHeader("mysql-response", rows.serverStatus);
					res.send(response);
					res.end();
				}
			});

		}
	});
}

exports.deleteRecord = function (req, res, pool) {
	
	var record = req.body;
	console.log('define record: ',record);

	var signature = record.Signature;
	var table = record.table;
	var IdSF = record.Id

	delete record.Signature;
	delete record.table;
	delete record.Id;

	getOauth(signature, pool, function (err, connection) {
		var response = {}

		if (err) {
			response.errno = err.errno;
			response.error = err.message; 
			
			res.setHeader("mysql-response", err.errno);
			res.send(response);
			res.end();
		}
		if (connection) {

			var sqlQuery = "DELETE FROM "+table+" WHERE IdSF = '"+IdSF+"'";

			connection.query(sqlQuery, function (err, rows) {
				if (err) {
					response.errno = err.errno;
					response.error = err.message; 
					
					res.setHeader("mysql-response", err.errno);
					res.send(response);
					res.end();
				}
				if (rows) {

					console.log(rows);

					response.message 	 = "success";

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

	console.log('init getOauth!');

	pool.getConnection(function (err, connection){

		console.log('start connection!');
	
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

					/*If the signature es missing or incorrect*/
					if (signature === undefined) {
						err = {}
						err.errno = 4011;
						err.message = "The connection was denied not authorized. The signature is missing";		

						callback(err, false);
						return err;
					} 

					var signatureArray 	= signature.split(".");
					var encodedEnvelope = signatureArray[0];
					var consumerSecret 	= signatureArray[1];
					var crypto 			 		= require('crypto');


					check = crypto.createHmac('SHA256', rows[0]['Secret']).update(encodedEnvelope).digest('base64')

		    	if ( check === consumerSecret ) {
		    		callback(false, connection);
	    		}else{
	    			err = {};
	    			err.errno = 4012;
	    			err.message = "The connection was denied not authorized. The signature is incorrect";
	    			callback(err, false);
	    		}

				}
			});
		}
	});

}