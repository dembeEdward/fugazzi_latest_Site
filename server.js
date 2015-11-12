var express = require('express');
var https = require('https');
var bodyParser = require('body-parser');
var request = require('request');
var mongojs = require('mongojs');

var app = express();

var databaseUrl = "mongodb://localhost:27017/fugazzi";
var collections = ["categories", "prices"];
var db = mongojs(databaseUrl, collections);

var address1 = "";
var address2 = "";
var distanceResult = {};
var location = "";

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Allow CORS (Cross Origin Resource Sharing)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.post('/getDistance', function(req, res){

	console.log("Addresses recieved");
	console.log(req.body.address1);
	console.log(req.body.address2);

	request('https://maps.googleapis.com/maps/api/distancematrix/json?origins='+ req.body.address1 +'&destinations='+ req.body.address2 +'&key=AIzaSyCVgE0rGwJ0_mxl_XgywwoMLjXqab-4Evg', 
		function (error, response, body) {
  			if (!error && response.statusCode == 200) {
    		distanceResult = body;
    		console.log("distant result found"); 
    		console.log(distanceResult);
			res.send(distanceResult);
  		}
	});
});

app.get('/getAllItems', function(req, res){
	
	console.log('getting all items');

	db.categories.find(function(err, docs){

		console.log('sending all items');
		res.json(docs);
	});
});

app.get('/getPrices', function(req, res){
	
	console.log('getting prices');

	db.prices.find(function(err, docs){

		console.log('sending prices');
		res.json(docs);
	});
});

app.listen(3000);
console.log("Server running on port 3000");