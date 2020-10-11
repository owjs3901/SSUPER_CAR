const express = require('express')
const app = new express();
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

let api = require('./api');

let client = null;

app.use(bodyParser.json());
/* ----- session ----- */
app.use(cookieSession({
	name: 'session',
	keys: [crypto.randomBytes(32).toString('hex')],

	// Cookie Options
	maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(cookieParser())

app.use(cors());

/* ----- serve static ----- */
app.use(express.static(path.join(__dirname, 'views')));
// app.set('view engine', 'ejs');
// app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, 'views'));

app.use('/api', api.router)

app.get('/', function (req, res) {
	res.redirect('/index.html')
})

const data = {data : [
	[1, 2, 3, 4, 5, 6, 7],
	[1, 2, 3, 4, 5, 6, 7],
	[1, 2, 3, 4, 5, 6, 7],
	[false]
]
}
let dataIndex = 0;

app.get('/data', function(req, res){
	data.data[3][0] = global.nowModel.ok
	res.json(data);
})

app.use(express.static(__dirname + '/../client/build'));

app.listen(3000)
/**
 * TCP
 */
const net = require('net');

const server = net.createServer(function (socket){
	//습도 / 온도 / 비접촉온도센서
	client = socket
	socket.on('data', function (data0){
		const str = data0.toString('UTF-8')
		
		let a = str.split(' ')
		data.data[0].splice(0, 1)
		data.data[1].splice(0, 1)
		data.data[2].splice(0, 1)

		data.data[0].push(parseInt(a['0']))
		data.data[1].push(parseInt(a['1']))
		data.data[2].push(parseInt(a['2']))
		if(dataIndex == 7)
			dataIndex = 0;
		console.log('rcv:' + data0 + '!')

		if(global.nowModel.ok)
			client.write('GO')
		else
			client.write('STOP')
	})
	socket.on('error', function (error) {
		console.error(error)
	})
})
server.on('error', function (error) {
	console.error(error)
})
server.listen(3001)
