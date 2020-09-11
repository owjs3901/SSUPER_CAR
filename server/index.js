const express = require('express')
const app = new express();
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');


app.use(bodyParser.json());
/* ----- session ----- */
app.use(cookieSession({
	name: 'session',
	keys: [crypto.randomBytes(32).toString('hex')],

	// Cookie Options
	maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(cookieParser())

/* ----- serve static ----- */
app.use(express.static(path.join(__dirname, 'views')));
// app.set('view engine', 'ejs');
// app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, 'views'));

app.use('/api', require('./api'))

app.get('/', function (req, res) {
	res.redirect('/index.html')
})

app.use(express.static(__dirname + '/../client/build'));

app.listen(3000)

/**
 * TCP
 */
const net = require('net');
const server = net.createServer(function (socket){
	socket.on('data', function (data){
		console.log('rcv:' + data)
	})
})
server.on('error', function (error) {
	console.error(error)
})
server.listen(3001)
