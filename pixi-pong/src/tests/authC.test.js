const io = require('socket.io-client');
var sock = io('http://127.0.0.1:5050',{
    transportOptions: {
      polling: {
        extraHeaders: {
          'clientid': 'tt'
        }
      }
    }});

sock.on('creation', () => {
    console.log('client connected')
})





