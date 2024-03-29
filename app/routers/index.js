var sf = require(__dirname + '/salesforce');

module.exports = function (router, mysql, pool) {
	
	/* Functions INSERT, UPDATE, DELETE records - SF to RDS */
	router.post('/insert/', function (req, res) { 
		sf.insertRecord(req.body, res, pool);
	});
	router.post('/update/', function (req, res) { 
		sf.updateRecord(req.body, res, pool);
	});
	router.post('/delete/', function (req, res) { 
		sf.deleteRecord(req.body, res, pool);
	});

	router.get('/', function (req, res) {
		res.send('SF insert test!');
		res.end();
	})
	// router.put('/update/', function (req, res) {});
	// router.delete('/delete/', function (req, res) {});
}