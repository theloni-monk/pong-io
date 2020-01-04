import * as socketio from "socket.io";
var p1Sock: socketio.Socket; //P1 is creator
var p2Sock: socketio.Socket;
process.send(process.argv.toString());

let p1Sock_name = process.argv[2];
let p2Sock_name = process.argv[3];
process.send('Hi from LiveServer');
process.on('uncaughtException', (err: any) => {
    process.send('Process exit on ERROR, err encountered: ' + err.toString() + '\n' + err.stack);
});
///////SETUP SERVER AND CONNECT TO CLIENTS\\\\\\\\
// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);

/////// Routing bs \\\\\\\\
var io = require('socket.io')(server, {
    handlePreflightRequest: (req: any, res: any) => { //dealing with fucking CORS bullshit
        //process.send('req headers:' + req.headers);
        const headers = {
            "Access-Control-Allow-Headers": "clientid", // allow my authorization header
            "Access-Control-Allow-Origin": req.headers['origin'], // allow access from any origin
            "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
    }
});
var port = Number(process.argv[5]); //game port increments, match port 5000

app.use(express.static(path.join(__dirname, 'public')));

io.use((socket: any, next: any) => { //clientid validation middleware
    //process.send('clientid middleware in use');
    let clientid = socket.handshake.headers['clientid'];
    if (clientid === p1Sock_name || clientid === p2Sock_name) { return next(); }
    //else:
    process.send('rejected bad clientid');
    return next(new Error('authentication error'));
});

server.listen(port, () => {
    process.send('LiveServer listening at port ' + port.toString());
});

//////// Connecting to Clients \\\\\\\\
process.send('Waiting for clients to connect');
io.on('connection', (socket: socketio.Socket) => {
    let clientid = socket.handshake.headers['clientid']
    process.send('LiveServer recieved connection, clientid: ' + clientid)

    if (clientid === p1Sock_name) {
        p1Sock = socket;
        p1Sock.join('gRoom');
        p1Sock.emit('creation');
        p1Sock.on('GEVENT', (eventType: string, eventParams: any) => { handleGEVENT(p1Sock, eventType, eventParams); });
        p1Sock.on('disconnect', () => { process.exit(); })
        if (p2Sock != null) {
            process.send('Both clients connected');
        }
    }
    else if (clientid === p2Sock_name) {
        p2Sock = socket;
        p2Sock.join('gRoom');
        p2Sock.emit('creation')
        p2Sock.on('GEVENT', (eventType: string, eventParams: any) => { handleGEVENT(p2Sock, eventType, eventParams); });
        p2Sock.on('disconnect', () => { process.exit(); })
        if (p1Sock != null) {
            process.send('Both clients connected');
        }
    }
});



process.on('exit', () => { p1Sock.emit('ERROR', 'LiveServer exit'); p2Sock.emit('ERROR', 'LiveServer exit') }) //alert clients on exit

//////// HANDLE CLIENT GAME \\\\\\\\\
var score: number[] = [0, 0];
var firstTo: number = Number(process.argv[4])
var p1Ready: boolean = false;
var p2Ready: boolean = false;
var p1Pos: number = 0;
var p2Pos: number = 0;
var ballPos: number[];

const bSize = 16;
const pSize = [16, 90];
const pOffset = 30;
const windowbounds: number[] = [700, 500];
const maxSpeed: number = 350;
//TODO: fix bouncing math (higher hit, higher angle)
// format [x, y, width, height]
function rectCollision(a: number[], b: number[]): boolean {
    // distance b/w the xs of the rects less than the combine width
    return !(
        ((a[1] + a[3]) < (b[1])) ||
        (a[1] > (b[1] + b[3])) ||
        ((a[0] + a[2]) < b[0]) ||
        (a[0] > (b[0] + b[2]))
    );
}
class pongball {
    pos: number[]
    Vx: number
    Vy: number
    rectBounds: number[][]
    cFlag: String
    constructor(props: any) {
        this.pos = props.pos;
        this.Vx = props.Vx;
        this.Vy = props.Vy;
        //rectbounds is pos +- size/2
        this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
        this.cFlag = "";
    }

    //handles bouncing and collision detection, sets collision flag on player loss
    updatePos = (delta: number, PaddleYPos_both: number[]) => {
        //cap speeds at 300 to keep things sane
        this.Vx = Math.min(this.Vx, maxSpeed)
        this.Vx = Math.max(this.Vx, -maxSpeed)
        this.Vy = Math.min(this.Vy, maxSpeed)
        this.Vy = Math.max(this.Vy, -maxSpeed)

        this.pos[0] += this.Vx * delta;
        this.pos[1] += this.Vy * delta;
        this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
        let bRect = [this.rectBounds[0][0], this.rectBounds[0][1], bSize, bSize];
        let p1Rect = [pOffset, p1Pos, pSize[0], pSize[1]];
        let p2Rect = [windowbounds[0] - (pOffset + pSize[0]), p2Pos, pSize[0], pSize[1]];

        // Collision detection //
        // floor collision:
        if (this.rectBounds[0][1] < 0 || this.rectBounds[1][1] > windowbounds[1]) {
            //process.send("floor coll")
            this.Vy = -this.Vy * 1.1; // invert Vy on ceiling or floor collision
        }
        //TODO: fix math -> angle = atan((map(dist(intersect y, middle of paddle) => [-1,1]))/0.1763)
        //Bounces off left paddle logic: it needs to be on or behind the paddle and within the rectangle height of the paddle
        if (rectCollision(bRect, p1Rect)) {
            //process.send("P1 hit")
            this.Vx = -this.Vx * 1.3 // invert Vx on paddle collision
            return;
        }
        //Bounces off right paddle logic:
        else if (rectCollision(bRect, p2Rect)) {
            //process.send("P2 hit")
            this.Vx = -this.Vx * 1.3
            //let angle = Math.atan(()/0.1763)
            return;
        }
        // sets p1 or p2 cFlag when it hits goals:
        if (this.rectBounds[0][0] < 0 || this.rectBounds[1][0] > windowbounds[0]) {
            if (!this.cFlag) {
                //process.send("wall coll");
                this.cFlag = (this.rectBounds[0][0] < 0 ? "p1" : "p2");
                //process.send(this.cFlag + "L");
            }
            this.Vx = 0;
            this.Vy = 0;
        }
    }
}

class paddle {
    xPos: number // left of sprite, const
    yPos: number // top of sprite
    rectBounds: number[][]
    windowbounds: number[]
    cFlag: String
    constructor(props: any) {
        this.xPos = props.xPos;
        this.yPos = 0;

        this.rectBounds = [[this.xPos, this.yPos], [this.xPos + pSize[0], this.yPos + pSize[1]]];
    }
    updatePos = (yPos_M: number) => {
        //process.send("Coordinates: (" + event.clientX + "," + event.clientY + ")");
        this.yPos = Math.max(yPos_M, 0);
        this.yPos = Math.min(this.yPos, windowbounds[1] - pSize[1]);
        //process.send("yPos: " + this.yPos);
        this.rectBounds = [[this.xPos, this.yPos], [this.xPos + pSize[0], this.yPos + pSize[1]]];
    }
}

var p1Paddle = new paddle({ xPos: pOffset });
var p2Paddle = new paddle({ xPos: windowbounds[0] - (pOffset + pSize[0]) });

// create ball and set velocities in a rand direction:
var ballVel = 125
var dir = Math.floor(Math.random() * 2) ? 1 : -1
var angle = Math.ceil(Math.random() * (Math.PI)); // send the ball at velocity ballVel in random angle
var ball = new pongball({
    size: 20,
    pos: [windowbounds[0] / 2, windowbounds[1] / 2],
    Vx: ballVel * Math.cos(angle) * dir,
    Vy: ballVel * Math.sin(angle)
})

function handleGEVENT(socket: socketio.Socket, eventType: string, eventParams: any) {
    switch (eventType) {
        case 'MEVENT':
            eventParams.player == 'p1' ? p1Pos = eventParams.mPos : p2Pos = eventParams.mPos;
            //socket.broadcast.emit('MEVENT', eventParams.mPos);
            break;
        case 'PLAYER_READY':
            //process.send('Reveieved PLAYER_READY from: ' + eventParams.player)
            eventParams.player == 'p1' ? p1Ready = true : p2Ready = true;
            if (p1Ready && p2Ready) {
                process.send('Both players ready')
                socket.broadcast.emit('GAME_START');
                socket.emit('GAME_START');
                previousTick = Date.now();
                updateLoop();
                process.send('gameloop started');
            }
            break;
        case 'ESCAPE':
            process.send('Game closing on escape');
            p1Sock.emit('GAME_END', score);
            p2Sock.emit('GAME_END', score);
            pauseLoop(true);
            break;
        default:
            process.send("recieved invalid GEVENT: " + eventType);
            socket.emit('ERROR', 'INVALID_GEVENT_TRANSMISSION');
    }
}

//////// UPDATE LOOP \\\\\\\\\
function update(delta: number): void { //delta in ms ~8.3ms
    p1Sock.broadcast.emit('MEVENT', p1Pos);
    p2Sock.broadcast.emit('MEVENT', p2Pos);

    ball.updatePos(delta, [p1Pos, p2Pos]);
    ballPos = ball.pos;
    if (ball.cFlag) { 
        ball.cFlag == "p1" ? score[1]++ : score[0]++;
        //process.send('cFlag: '+ ball.cFlag);
        //process.send('score: '+ score.toString());
        if (score[0] === firstTo || score[1] === firstTo) {
            p1Sock.emit('GAME_END', score);
            p2Sock.emit('GAME_END', score);
            process.send((ball.cFlag == "p1" ? 'p1' : 'p2') + ' has won')
            pauseLoop(true);
        }
        else {
            p1Sock.emit('SCORE', score);
            p2Sock.emit('SCORE', score);
        }
        ballVel += 10
        dir = Math.floor(Math.random() * 2) ? 1 : -1
        angle = Math.ceil(Math.random() * (Math.PI)); // send the ball at velocity ballVel in random angle
        ball = new pongball({
            size: 20,
            pos: [windowbounds[0] / 2, windowbounds[1] / 2],
            Vx: ballVel * Math.cos(angle) * dir,
            Vy: ballVel * Math.sin(angle)
        })
        return;
    }
    p1Sock.emit('BALL_DATA', { pos: ballPos, Vx: ball.Vx, Vy: ball.Vy });
    //flip X for p2
    p2Sock.emit('BALL_DATA', { pos: [windowbounds[0] - ballPos[0], ballPos[1]], Vx: -ball.Vx, Vy: ball.Vy });
}

/** 60fps timed execution: credit to github u/timetocode for solution to javascript not having acutate timers **/
// length of a tick in milliseconds.
var tickLengthMs = 1000 / 120;

/* updateLoop related variables */
// timestamp of each loop
var previousTick = Date.now();

var pauseLoopFlag: boolean = false;
function updateLoop() {
    var now = Date.now();

    if (previousTick + tickLengthMs <= now) {
        var delta = (now - previousTick) / 1000;
        previousTick = now;

        if (!pauseLoopFlag) { update(delta); }
    }

    if (Date.now() - previousTick < tickLengthMs - 16) {
        setTimeout(updateLoop);
    } else {
        setImmediate(updateLoop);
    }
}

var pauseLoop = (p: boolean): void => { // pauseloop(true) to pause, pauseloop(false) to unpause
    pauseLoopFlag = p
}
