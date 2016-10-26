var express = require('express');
var fs = require('fs');

//setup the root path
var root = __dirname;

var app = express();

app.use('/assets',express.static('assets'));
app.use('/controllers',express.static('controllers'));
app.use('/models',express.static('models'));
app.use('/services',express.static('services'));

app.get('/', function (req, res) {
	fs.readFile('assets/static/index.html', 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
	res.send(data);
	});
});

app.listen(8080, function() {
    console.log("App open on localhost:8080");
});
