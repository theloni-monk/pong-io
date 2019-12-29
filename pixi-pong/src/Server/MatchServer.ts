/* eslint-disable no-undef */
//PSEUDO CODE
/**
 * client connects to server 
 * client can request the names of all the matches/rooms
 * client can request to create match, with match name; or to join a match
 * clients can then emit volitile MouseEvents to the match/room to communicate with the peer
 * once a room has two clients it is no longer available
 */
const { fork } = require('child_process');
import * as socketio from "socket.io";
// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = 5000;

server.listen(port, () => {
	console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));
console.log(path.join(__dirname, 'public'));

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export interface match {
	name: string
	//TODO: creatorId: string; for deleteing based on creator
	//TODO: password: string; for private games
	playerNames: string[] // players[0] is always owner
	//FIXME: add mac addresses to match
	isFull: boolean
	firstTo: number
	process: any // pointer to forked process on live server (allows match server to check if process has been killed)
}

//matchDict is an object(dictionary) with matchnames being properties(keys) 
var allMatchDict: any = {} // array of rooms
var openMatchDict: any = {} // same

function createMatch(socket: SocketIO.Socket, matchName: string, creatorName: string, firstTo: number = 7): void {
	console.log('creating match: ' + matchName);
	if (matchExists(matchName)) {
		console.log('ERROR in createMatch match already exists')
		socket.emit('ERROR', 'match already exists')
		return;
	}

	//create match 
	let m: match = {
		name: matchName,
		playerNames: [],
		isFull: false,
		firstTo: firstTo,
		process: null
	};
	m.playerNames.push(creatorName);

	allMatchDict[m.name] = m; //add it as a property to the object
	openMatchDict[m.name] = m;

	socket.join(m.name); // socket joins room
	//socket.broadcast.emit('OTHER_PLAYER_READY') //NOTE: not sure if this will be recieved once the other player joinse
	//NOTE: client must then wait for others to join room and can no longer join a room without reloading

	console.log('match successfully created');

	//NOTE: not sure if this will fuck me over
	//set 10 min timeout to destroy the match if it isnt full
	//FIXME: make idle match deletion smarter 
	setTimeout(() => {
		if (!allMatchDict[m.name]) return; // if its already deleted ignore
		console.log('DELETEING IDLE MATCH');
		if (!m.isFull) {
			delete allMatchDict[m.name];
			delete openMatchDict[m.name]; // we know its in openmatchdict bc its not full
		}
	}, 10 * 60 * 1000);
}

// checks if a match Exists; should be async?
function matchExists(matchName: string): boolean {
	return allMatchDict.hasOwnProperty(matchName);
}

io.on('connection', (socket: SocketIO.Socket) => {
	console.log('connected to new client');
	console.log(socket.conn.remoteAddress)
	socket.emit('connected', true);
	socket.setMaxListeners(12);

	//TODO: have names be inheirant
	//GET_ALL_MATCHES request would look like:
	//clientsocket.emit('CREATE_MATCH', 'match_name');
	socket.on('GET_ALL_MATCHES', () => {
		console.log('recieved GET_ALL_MATCHES request');
		socket.emit('RECV_ALL_MATCHES', allMatchDict);
	}
	);

	socket.on('GET_OPEN_MATCHES', () => {
		console.log('recieved GET_OPEN_MATCHES request');
		socket.emit('RECV_OPEN_MATCHES', openMatchDict);
	}
	);

	socket.on('GET_MATCH_BY_NAME', (matchName:string) => {
		console.log('recieved GET_MATCH_BY_NAME request for name:'+matchName);
		socket.emit('RECV_MATCH_BY_NAME', allMatchDict[matchName]);
	}
	);

	//CREATE_MATCH request would look like:
	//clientsocket.emit('CREATE_MATCH', 'match_name', 'client_name').on('ERROR', doSomthing);
	socket.on('CREATE_MATCH', (matchName: string, creatorName: string, firstTo: number = 7) => {
		console.log('recieved CREATE_MATCH request from creator: ' + creatorName);
		createMatch(socket, matchName, creatorName, firstTo ? firstTo : 7);
	}
	);

	socket.on('JOIN_MATCH', (matchName: string, joinerName: string) => {
		console.log('recieved JOIN_MATCH request from: ' + joinerName + ', to match: ' + matchName);
		if (!matchExists(matchName)) {
			console.log('ERROR match does not exist');
			socket.emit('ERROR', 'match does not exist');
			return;
		}
		if (allMatchDict[matchName].isFull) {
			console.log('ERROR match is full');
			socket.emit('ERROR', 'match is full');
			return;
		}

		delete openMatchDict[matchName]; // match is no longer open
		allMatchDict[matchName].playerNames.push(joinerName);
		allMatchDict[matchName].isFull = true;
		socket.join(matchName);
		socket.broadcast.emit('OTHER_PLAYER_READY', joinerName);
		console.log(joinerName + ' has joined match ' + matchName);

		// fork live server:
		let LiveServer = path.resolve('./LiveServer.ts');
		let parameters:any[] = [allMatchDict[matchName].playerNames[0], allMatchDict[matchName].playerNames[1]]; //pass creatorsock ipv6 and joinersock ipv6
		let options = {
		stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
		};
		allMatchDict[matchName].process = fork(LiveServer, parameters, options);
		console.log('LiveServer forked from MatchServer');
		allMatchDict[matchName].process.on('message', (msg:string) => {
			console.log('Message from LiveServer instace:', msg);
		});
	}
	);
	//TODO: on socket disconnect destroy matches it created
}
);
