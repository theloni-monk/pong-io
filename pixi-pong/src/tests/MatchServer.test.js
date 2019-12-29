const io = require('socket.io-client');
var sock = io('http://127.0.0.1:5000');
var sock2 = io('http://127.0.0.1:5000', {forceNew: true});
console.log('hello');

sock.on('ERROR', function(msg){
    console.log('sock1 recived err msg: '+ msg);
});
sock.on('RECV_ALL_MATCHES', (matches) => {
    console.log(matches);
});

sock2.on('ERROR', function(msg){
    console.log('sock2 recived err msg: '+ msg);
});
sock2.on('RECV_ALL_MATCHES', (matches) => {
    console.log(matches);
});

var s2connected = false;
sock2.on('connect', () => {s2connected = true;})
sock.on('connect', () => {
    console.log('connected to server');

    sock.emit('CREATE_MATCH', 'test-match', 'tester123');
    console.log('tester123 sent create_match');

    sock.emit('CREATE_MATCH', 'test-match', 'tester123');
    console.log('tester 123 sent create_match again');

    sock.emit('GET_ALL_MATCHES');
    console.log('tester123 sent get_all_matches');

    //while(!s2connected){   
        //wait
    //}
    sock2.emit('JOIN_MATCH', 'test-match', 'p2');
    console.log('sock2 sent join_match request');
    sock2.emit('GET_ALL_MATCHES');
    console.log('sock2 sent get_all_matches');
}
);