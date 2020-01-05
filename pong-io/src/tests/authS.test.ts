import * as socketio from "socket.io";
var p1Sock: socketio.Socket; //P1 is creator

var p2Sock: socketio.Socket;
///////SETUP SERVER AND CONNECT TO CLIENTS\\\\\\\\
// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 5050; //game port 5050, match port 5000

server.listen(port, () => {
	console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));
console.log(path.join(__dirname, 'public'));

io.use((socket:any, next:any) => {
	console.log('test')
	let clientId = socket.handshake.headers['clientid'];
	if (clientId === 'abc') {
	  return next();
	}
	console.log('rejected bad clientid')
	return next(new Error('authentication error'));
});

io.on('connection', (socket: socketio.Socket) => {
    console.log('server connected')
})