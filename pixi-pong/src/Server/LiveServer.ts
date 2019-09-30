import * as socketio from "socket.io";
var p1Sock: socketio.Socket;
var p2Sock: socketio.Socket;

process.on('message', (m, sock) => {
    if (m === 'sock1') { p1Sock = sock; }
    else if (m === 'sock2') { p2Sock = sock; }
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function waitForSocks() {
    while (typeof p2Sock === "undefined") {
        await sleep(100);
    }
}
//wait to get handle on sockets
waitForSocks();

var score: number[] = [0, 0];
var p1Pos: number = 0;
var p2Pos: number = 0;
var ballPos: number[];

const _DEBUG = false;
const bSize = 16;
const pSize = [16, 90];
const pOffset = 30;
const windowbounds: number[] = [700, 500];
//WRITEME: server side calculation
//TODO: fix bouncing math (higher hit, higher angle)
class pongball {
    pos: number[]
    Vx: number
    Vy: number
    rectBounds: number[][]
    cFlag: String
    pBounceInvin: number
    fBounceInvin: number
    constructor(props: any) {
        this.pos = props.pos;
        this.Vx = props.Vx;
        this.Vy = props.Vy;
        //rectbounds is pos +- size/2
        this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
        this.cFlag = ""
        this.pBounceInvin = 0;
        this.fBounceInvin = 0;
    }

    //WRITME: rewrite collision detection to be server side
    //handles bouncing and collision detection, sets collision flag on player loss
    updatePos = (delta: number, PaddleYPos_both: number[]) => {
        //console.log("pongball updated")
        if (!_DEBUG) {
            this.pos[0] += this.Vx * delta;
            this.pos[1] += this.Vy * delta;
            this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
        }
        // Collision detection //
        let bouncing = false; // can't bounce on multiple things in one frame
        // it can't bounce on the same object within 5 frames

        // floor collision:
        if (this.fBounceInvin === 0) {
            if (this.rectBounds[0][1] < 0 || this.rectBounds[1][1] > windowbounds[1]) {
                console.log("floor coll")
                this.Vy = -this.Vy * 1.1; // invert Vy on ceiling or floor collision
                this.fBounceInvin = 5; // set invin frames
                bouncing = true;
            }
        }

        if (this.pBounceInvin === 0 && !bouncing) {
            //		  Bounces off left paddle logic: it needs to be on or behind the paddle and within the rectangle height of the paddle
            if ((this.rectBounds[0][0] <= pSize[0] + pOffset) && (PaddleYPos_both[0] <= this.rectBounds[0][1] && this.rectBounds[1][1] <= PaddleYPos_both[0] + pSize[1])) {
                console.log("P1 hit")
                //TODO: add math for collisions to send in dir based on where paddle was hit
                this.Vx = -this.Vx * 1.1 // invert Vx on paddle collision
                this.pBounceInvin = 15 // set invin frames
                bouncing = true;
            }
            //		  Bounces off right paddle logic:
            else if ((this.rectBounds[0][0] >= windowbounds[0] - (pSize[0] + pOffset)) && (PaddleYPos_both[1] <= this.rectBounds[0][1] && this.rectBounds[1][1] <= PaddleYPos_both[1] + pSize[1])) {
                console.log("P2 hit")
                this.Vx = -this.Vx
                this.pBounceInvin = 15;
            }
        }
        // sets P1L or P2L cFlag when it hits goals:
        if (this.rectBounds[0][0] < 0 || this.rectBounds[1][0] > windowbounds[0]) {
            if (!this.cFlag) {
                console.log("wall coll");
                this.cFlag = (this.rectBounds[0][0] < 0 ? "P1" : "P2") + "L";
                console.log(this.cFlag);
            }
            this.Vx = 0;
            this.Vy = 0;
            //this.Vx = -this.Vx;
        }
        if (this.fBounceInvin !== 0) { this.fBounceInvin--; }
        if (this.pBounceInvin !== 0) { this.pBounceInvin--; }
        //This regects bounces if it is past a threshold so that the ball cant bounce inside the paddle
        if (this.rectBounds[0][0] < pOffset || this.rectBounds[1][0] > windowbounds[0] - (pOffset)) {
            this.pBounceInvin = 15;
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
        //console.log("Coordinates: (" + event.clientX + "," + event.clientY + ")");
        this.yPos = Math.max(yPos_M, 0);
        this.yPos = Math.min(this.yPos, windowbounds[1] - pSize[1]);
        //console.log("yPos: " + this.yPos);
        this.rectBounds = [[this.xPos, this.yPos], [this.xPos + pSize[0], this.yPos + pSize[1]]];
    }
}

var p1Paddle = new paddle({ xPos: pOffset });
var p2Paddle = new paddle({ xPos: windowbounds[0] - pOffset });

// create ball and set velocities in a rand direction:
var ballVel = 3.75
var dir = Math.floor(Math.random() * 2) ? 1 : -1
var angle = Math.ceil(Math.random() * (Math.PI)); // send the ball at velocity ballVel in random angle
var ball = new pongball({size: 20,
    pos: [windowbounds[0] / 2, windowbounds[1] / 2],
    Vx: ballVel * Math.cos(angle) * dir,
    Vy: ballVel * Math.sin(angle) 
})

//WRITEME: handling sync events: begin, score, end:
async function handleGEVENT(socket: socketio.Socket, eventType: string, eventParams: any): Promise<any> {
    switch (eventType) {
        case 'MEVENT_S':
            //socket.broadcast.emit('MEVENT_C', eventParams.mPos);
            //WRITEME: server side handling
            socket === p1Sock ? p1Paddle.updatePos(eventParams['mPos']) : p2Paddle.updatePos(eventParams['mPos']) ;
            break;

        // this will keep sending player ready until it is seen:
        case 'PLAYER_READY':
            var recieved = false;
            socket.on('PR_RECIEVED', () => { recieved = true; })
            while (!recieved) {
                //console.log('sending player ready')
                socket.broadcast.emit('PLAYER_READY');
                await sleep(500);
            }
            socket.removeListener('PR_RECIEVED', () => { recieved = true; });
            console.log("Player has readied");
            break;

        case 'INIT_BALL':
            socket.broadcast.emit('INIT_BALL', eventParams);
            break;

        default:
            console.log("recieved invalid GEVENT");
            socket.emit('ERROR', 'INVALID_GEVENT_TRANSMISSION');
    }
}

p1Sock.on('GEVENT', (eventType: string, eventParams: any) => { handleGEVENT(p1Sock, eventType, eventParams); });
p2Sock.on('GEVENT', (eventType: string, eventParams: any) => { handleGEVENT(p2Sock, eventType, eventParams); });

//WRITEME: udpate to relay info back to clients

function update(delta: number):void {

} 

/** 60fps timed execution: credit to github u/timetocode for solution to javascript not having acutate timers **/ 
// length of a tick in milliseconds.
var tickLengthMs = 1000 / 60;

/* updateLoop related variables */
// timestamp of each loop
var previousTick = Date.now();
// number of times gameLoop gets called
var actualTicks = 0;

var updateLoop = ():void => {
  var now = Date.now();

  actualTicks++;
  if (previousTick + tickLengthMs <= now) {
    var delta = (now - previousTick) / 1000;
    previousTick = now;

    update(delta);

    console.log('delta', delta, '(target: ' + tickLengthMs +' ms)', 'node ticks', actualTicks);
    actualTicks = 0;
  }

  if (Date.now() - previousTick < tickLengthMs - 16) {
    setTimeout(updateLoop);
  } else {
    setImmediate(updateLoop);
  }
}

var pauseLoop = ():void =>{
    //WRITEME: for player waiting
}
// begin the loop
updateLoop()
