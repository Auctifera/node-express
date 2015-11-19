/* Salesforce integration methods
 * Methods: inserdRecord, updateRecord, deleteRecord
 * Functions: getOauth, responseError
 * Test use: advanced rest client
 */

/* Insert or update record - Salesforce to RDS
 * Expects: req.body, res, pool
 * Returns: if error: errno, message
 * 					if rows: Id, IdSalesforce(IdSF), table
 * Test variables: table: record.type, record.Recordtype: record.RecordType; 
 */
exports.insertRecord = function (record, res, pool) {
		
	getOauth(record.Signature, pool, function (err, connection) {

		if (err) {
			responseError(err, res);
			return;
		}
		
		//record.type
		var table = record.attributes.type;
		
		record.IdSF = record.Id;

		if (record.RecordType != undefined) {
			//record.RecordType
			record.RecordType = record.RecordType.attributes.DeveloperName;
		};

		delete record.Signature;
		//record.type
		delete record.attributes;
		delete record.Id;
		
		/*build string query for insert/update like: 
		* "INSERT INTO type (`field name`, `field name`) 
		* VALUES('field value','field value') 
		*	ON DUPLICATE KEY UPDATE ?"
		*/
		var fieldsName 	= "";
		var fieldsValue = "";
		var fieldName 	= Object.keys(record);
		var fieldValue 	= Object.keys(record).map(function (val) {
			return record[val];
		});

		for (var i = fieldName.length - 1; i >= 0; i--) {
			fieldsName 	+= "`"+fieldName[i]+"`,";
			fieldsValue += "'"+fieldValue[i]+"',";
		}

		fieldsName 	= fieldsName.substring(0, fieldsName.length - 1);
		fieldsValue = fieldsValue.substring(0, fieldsValue.length - 1);

		var sqlQueryInsert = "INSERT INTO `"+table+"` ("+fieldsName+") "+
													"VALUES("+fieldsValue+") ON DUPLICATE KEY UPDATE ?";

		connection.query(sqlQueryInsert, record, function (err, rows) {

			if (err) {
				responseError(err, res);
				return;
			};

			var response = {};

			response.Id 	 = rows.insertId;
			response.IdSF  = record.IdSF;
			response.table = table;

			//if not update data get Id record 
			if (rows.insertId === 0) {

				var sqlQueryGetId = "SELECT Id FROM "+table+" WHERE IdSF = '"+record.IdSF+"'";

				connection.query(sqlQueryGetId, function (err, rows) {

					if (err) {
						responseError(err, res);
						return;
					};

					response.Id = rows[0].Id;

					res.setHeader("mysql-response", 2);
					res.send(response);
					res.end();

				});

				return;
			};

			res.setHeader("mysql-response", 2);
			res.send(response);
			res.end();

		});

	});

}

/* Update record - Salesforce to RDS
 * Expects: req.body, res, pool
 * Returns: if error: errno, message
 * 					if rows: message, changedRows
 * Test: table: record.type, record.Recordtype: record.RecordType; 
 */
exports.updateRecord = function (record, res, pool) {
	
	getOauth(record.Signature, pool, function (err, connection) {

		if (err) {
			responseError(err, res);
			return;
		}

		//record.type
		var table = record.attributes.type;
		var IdSF 	= record.Id
	
		record.IdSF = record.Id;

		if (record.RecordType != undefined) {
			//record.RecordType
			record.RecordType = record.RecordType.attributes.DeveloperName;
		};

		delete record.Signature;
		//record.type
		delete record.attributes;
		delete record.Id;

		var sqlQuery = "UPDATE "+table+" SET ? WHERE IdSF = '"+IdSF+"'";

		connection.query(sqlQuery,record, function (err, rows) {
			
			if (err) {
				responseError(err, res);
				return;
			}
			
			var response = {};

			response.message 	 		= rows.message;
			response.changedRows  = rows.changedRows;

			res.setHeader("mysql-response", rows.serverStatus);
			res.send(response);
			res.end();
		});
	});
}

/* Delete record - Salesforce to RDS
 * Expects: req.body, res, pool
 * Returns: if error: errno, message
 * 					if rows: message, changedRows
 */
exports.deleteRecord = function (record, res, pool) {

	getOauth(record.Signature, pool, function (err, connection) {

		if (err) {
			responseError(err, res);
			return;
		}

		var sqlQuery = "DELETE FROM "+record.type+" WHERE IdSF = '"+record.Id+"'";
		
		connection.query(sqlQuery, function (err, rows) {
				
			if (err) {
				responseError(err, res);
				return;
			}
			
			var response = {};

			response.message 	 = "Delete record: "+rows.changedRows;
			
			res.setHeader("mysql-response", rows.serverStatus);
			res.send(response);
			res.end();
		
		});
	
	});

}

/* Get oauth RDS using Salesforce signature
 * Expects: signature Salesforce(signature), pool, function(err,connection)(callback)
 * Returns: if error -> errno, message
 * 					if check -> connection
 */
function getOauth(signature, pool, callback) {

	if (signature === undefined) {
		
		var err = {
			errno : 4011,
			message : 'The connection was denied not authorized. The signature is missing'
		}; 

		callback(err, false);
		return;
	}

	pool.getConnection(function (err, connection){

		if (err) {
			err.message = "Error in database connection";
			callback(err, connection);
			return;
		};

		var sqlQuery = "SELECT Secret FROM Credentials__c";

		connection.query(sqlQuery, function (err, rows) {

			if (err) {
				err.message = "Error in database query";
				callback(err, connection);
				return;
			};

			var signatureArray 	= signature.split(".");
			var encodedEnvelope = signatureArray[0];
			var consumerSecret 	= signatureArray[1];
			var crypto 			 		= require('crypto');

			check = crypto.createHmac('SHA256', rows[0]['Secret'])
										.update(encodedEnvelope).digest('base64');

    	if (check === consumerSecret) {
    		callback(false, connection);
    		return;
  		};
			
			err = {
				errno : 4012,
				message : 'The connection was denied not authorized. The signature is incorrect'
			};

			callback(err, false);	

		});

	});

}

/* Response server error 
 * Expects: err, res
 * Returns: null
 */
function responseError(err, res) {
	
	var response = {}

	response.errno = err.errno;
	response.error = err.message; 

	res.setHeader("mysql-response", err.errno);
	res.send(response);
	res.end();
	return;
}