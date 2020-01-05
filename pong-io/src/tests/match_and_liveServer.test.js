const io = require('socket.io-client');
var msock = io('http://127.0.0.1:5000');
var msock2 = io('http://127.0.0.1:5000', {forceNew: true});
console.log('hello');

msock.on('ERROR', function(msg){
    console.log('sock1 recived err msg: '+ msg);
});

msock2.on('ERROR', function(msg){
    console.log('sock2 recived err msg: '+ msg);
});


msock.on('connect', () => {
    console.log('connected to server');

    msock.emit('CREATE_MATCH', 'test-match2', 'p1');
    console.log('p1 sent create_match');
    
}
);

msock2.on('connect', () => {
    msock2.emit('JOIN_MATCH', 'test-match2', 'p2');
    console.log('sock2 sent join_match request');
    msock2.emit('GET_MATCH_BY_NAME', 'test-match2')
});

msock2.on('RECV_MATCH_BY_NAME', () => {
    var gsock = io('http://127.0.0.1:5050',{
        transportOptions: {
          polling: {
            extraHeaders: {
              'clientid': 'p1'
            }
          }
        }});
        console.log('gsock connecting')

    gsock.on('creation', () => {
        console.log('game client connected')
    })
    
    var gsock2 = io('http://127.0.0.1:5050',{
        transportOptions: {
          polling: {
            extraHeaders: {
              'clientid': 'p2'
            }
          }
        }});
      console.log('gsock2 connecting')
    
    gsock2.on('creation', () => {
        console.log('game client 2 connected')
    })
});

