/* eslint-disable no-undef */
//PSEUDO CODE
/**
 * client connects to server 
 * client can request the names of all the matches/rooms
 * client can request to create match, with match name; or to join a match
 * clients can then emit volitile MouseEvents to the match/room to communicate with the peer
 * once a room has two clients it is no longer available
 */

import * as socketio from "socket.io";
var io = require('socket.io')(80);

interface match {
	name: string
	players: string[] // players[0] is always owner
	isFull: boolean
}
//TODO: rewrite matches to be an object(dictionary) with matchnames being properties(keys) 
var matches: match[] = [] // array of rooms

function createMatch(socket: SocketIO.Socket, matchName: string, creatorName: string) : void {

	if(matchExists(matchName)){
		socket.emit('ERROR', 'match already exists')
		return;
	}

	//create match 
	let m: match;
	m.name = matchName;
	m.players.push(creatorName);
	m.isFull = false;

	matches.push(m); //push it to array

	socket.join(m.name); // socket joins room
	//NOTE: client must then wait for others to join room and can no longer join a room without reloading

	//NOTE: not sure if this will fuck me over
	//set 10 min timeout to destroy the match if it isnt full
	setTimeout(()=>{
		if(!m.isFull){
			let index = matches.indexOf(m);
			if(index!==-1){
				matches.splice(index, 1); // remove match from matches
			}
		}
	},10*60*1000);
}

// checks if a match Exists; should be async?
function matchExists(matchName:string){
	for(var i = 0; i<matches.length; i++){
		if(matches[i].name === matchName){
			return true;
		}
	}
	return false;
}

io.on('connection', function (socket: SocketIO.Socket) {
	socket.emit('connected', true);
}
);

//GET_ALL_MATCHES request would look like:
//clientsocket.emit('CREATE_MATCH', 'match_name');
io.on('GET_ALL_MATCHES', function (socket: SocketIO.Socket) {
	socket.emit('RECV_ALL_MATCHES', { ALL_MATCHES: matches });
}
);

//CREATE_MATCH request would look like:
//clientsocket.emit('CREATE_MATCH', 'match_name', 'client_name').on('ERROR', doSomthing);
io.on('CREATE_MATCH', function (socket: SocketIO.Socket, matchName: string, creatorName: string) {
	createMatch(socket, matchName, creatorName);
}
);

io.on('JOIN_MATCH', function (socket: SocketIO.Socket, matchName: string, joinerName: string){

	if(!matchExists(matchName)){
		socket.emit('ERROR', 'match does not exist')
		return;
	}

	//WRITEME: find match in matches by matchname, 
	//push new player to match.players
	//set isFull to true
	//have the socket join the room
	//brodcast event to the room that the match is ready to begin
}
);