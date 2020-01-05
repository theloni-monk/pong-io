import * as React from 'react';
import * as Pixi from 'pixi.js';

//constants:
const windowbounds: number[] = [700, 500];
const bSize = 16;
const pSize = [16, 90];
const pOffset = 30;


//NOTE: pongball and paddle in this file exist only for predictive rendering, 
// the objects that actually interact and matter exist on the server
class pongball {
	g: Pixi.Graphics
	pos: number[]
	Vx: number
	Vy: number
	rectBounds: number[][]
	constructor(props: any) {
		this.g = new Pixi.Graphics();
		this.pos = props.pos;
		this.Vx = props.Vx;
		this.Vy = props.Vy;
		//rectbounds is pos +- size/2
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
	}

	//handles bouncing and collision detection, sets collision flag on player loss
	updatePos = (delta: number) => {
		//console.log("pongball updated")
		this.pos[0] += this.Vx * delta;
		this.pos[1] += this.Vy * delta;
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
	}

	draw = () => {
		//console.log("pongball drawn")
		// Rectangle + line style 2
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
		this.g.clear()
		this.g.beginFill(0xFFFFFF);
		this.g.drawRect(this.rectBounds[0][0], this.rectBounds[0][1], bSize, bSize);
		this.g.endFill();
	}
}


class paddle {
	g: Pixi.Graphics
	xPos: number // left of sprite, const
	yPos: number // top of sprite
	rectBounds: number[][]
	windowbounds: number[]
	constructor(props: any) {
		this.xPos = props.xPos;
		this.yPos = 0;

		this.g = new Pixi.Graphics();
		this.rectBounds = [[this.xPos, this.yPos], [this.xPos + pSize[0], this.yPos + pSize[1]]];
	}

	updatePos_mouse = (yPos_M: number) => {
		//console.log("Coordinates: (" + event.clientX + "," + event.clientY + ")");
		this.yPos = Math.max(yPos_M, 0);
		this.yPos = Math.min(this.yPos, windowbounds[1] - pSize[1]);
		//console.log("yPos: " + this.yPos);
		this.rectBounds = [[this.xPos, this.yPos], [this.xPos + pSize[0], this.yPos + pSize[1]]];
	}

	draw = () => {
		//console.log("paddle draw called");
		this.g.clear();
		this.g.beginFill(0xFFFFFF);
		this.g.drawRect(this.rectBounds[0][0], this.rectBounds[0][1], pSize[0], pSize[1]);
		this.g.endFill();
	}
}


var socket: SocketIO.Socket;

interface GBProps {
	domTimer: any;
	socket: SocketIO.Socket;
	isCreator: boolean;
}
interface GBState { }
class GameBase extends React.Component<GBProps, GBState>{
	//protected socket: SocketIO.Socket
	protected app: Pixi.Application
	protected _updatefuncpointer: any
	protected gameCanvas: HTMLDivElement
	protected G: Pixi.Graphics
	private beginButton: Pixi.Text
	private P1score: Pixi.Text
	private P2score: Pixi.Text
	public score: number[]
	public gameOver: boolean
	protected ball: pongball
	protected paddle1: paddle
	protected paddle2: paddle

	constructor(props: any) {
		super(props);
		socket = this.props.socket;
		this.score = [0, 0];
		this.G = new Pixi.Graphics();
		this.gameOver = false;
	}

	// After mounting, add the Pixi Renderer to the div and start the Application.
	componentDidMount() {
		this.app = new Pixi.Application({
			width: windowbounds[0],
			height: windowbounds[1],
			backgroundColor: 0x000000,
			//antialias: true
		});
		this.gameCanvas.appendChild(this.app.view);
		this.app.start(); //start renderer;
		this.app.stage.addChild(this.G);
		//this.app.ticker.autoStart = false;
		//this.app.ticker.stop();
		socket.on('ERROR', (msg) => {
			alert(msg);
			window.location.reload(); // reload page on error
		});
		socket.on('SCORE', (s: number[]) => {
			this.score = s;
			this.drawScore();
		});
		socket.on('GAME_END', (score: number[]) => {
			this.score = score;
			this.endGame();
		})

		this.initGame();
	}

	initGame() {
		console.log("begingame called");
		this.G.clear();

		this.paddle1 = new paddle({
			xPos: pOffset
		});
		this.paddle2 = new paddle({
			xPos: windowbounds[0] - (pOffset + pSize[0])
		});
		socket.on('MEVENT', (mPosP2: number) => { this.updatePaddle2Pos_network(mPosP2) })
		this.app.stage.addChild(this.paddle1.g);
		this.app.stage.addChild(this.paddle2.g);


		this.ball = new pongball({
			size: 20,
			pos: [windowbounds[0] / 2, windowbounds[1] / 2],
			Vx: 0,
			Vy: 0
		});
		socket.on('BALL_DATA', (ballData: any) => {
			this.ball.pos = ballData.pos;
			this.ball.Vx = ballData.Vx;
			this.ball.Vy = ballData.Vy;
		});

		this._updatefuncpointer = (delta: number) => { this.updateGame(delta) }; //create update timer
		this.app.ticker.add(this._updatefuncpointer);


		this.beginButton = new Pixi.Text('Click To Begin', {
			fontFamily: 'Teko',
			fontSize: 75,
			fill: 'white',
			align: 'center',
		});
		this.beginButton.anchor.set(0.5)
		this.beginButton.position.set(windowbounds[0] / 2, windowbounds[1] / 2);
		this.beginButton.resolution = 4;
		this.beginButton.interactive = true;
		this.app.stage.addChild(this.beginButton);

		// when user readies wait for p2 
		this.beginButton.on('pointerdown', async () => {
			console.log("beginButton triggered")
			//GO INTO WAIT LOOP AND AWAIT THE PLAYER READY SOCKET EVENT
			this.app.stage.removeChild(this.beginButton);
			const waitText = new Pixi.Text(("Waiting for other player"), {
				fontFamily: 'Teko',
				fontSize: 65,
				fill: 'white',
				align: 'center',
			})
			waitText.anchor.set(0.5)
			//set to the side of the winner
			waitText.position.set(Math.floor(windowbounds[0] / 2), Math.floor(windowbounds[1] / 2));
			waitText.resolution = 2;
			this.app.stage.addChild(waitText);

			socket.on('GAME_START', () => {
				console.log('GAME_START received');
				this.props.domTimer(); //start timer in DOM
				this.app.stage.removeChild(waitText);
				this.drawScene();
				this.drawScore();
				this.app.stage.addChild(this.ball.g);
			})

			socket.emit('GEVENT', 'PLAYER_READY', { player: (this.props.isCreator ? 'p1' : 'p2') });
			//console.log('I am ' + (this.props.isCreator ? 'p1' : 'p2'))
		})
	}

	drawScene() {
		//NOTE: I stole this func
		function drawDashLine(G: Pixi.Graphics, lastPosition: number[], toX: number, toY: number, dash = 15, gap = 10) {
			const currentPosition = {
				x: Math.max(lastPosition[0], 0),
				y: Math.max(lastPosition[1], 0)
			};

			const absValues = {
				toX: Math.abs(toX),
				toY: Math.abs(toY)
			};

			for (; Math.abs(currentPosition.x) < absValues.toX || Math.abs(currentPosition.y) < absValues.toY;) {
				currentPosition.x =
					Math.abs(currentPosition.x + dash) < absValues.toX
						? currentPosition.x + dash
						: toX;
				currentPosition.y =
					Math.abs(currentPosition.y + dash) < absValues.toY
						? currentPosition.y + dash
						: toY;

				G.lineTo(currentPosition.x, currentPosition.y);

				currentPosition.x =
					Math.abs(currentPosition.x + gap) < absValues.toX
						? currentPosition.x + gap
						: toX;
				currentPosition.y =
					Math.abs(currentPosition.y + gap) < absValues.toY
						? currentPosition.y + gap
						: toY;

				G.moveTo(currentPosition.x, currentPosition.y);
			}
		};
		this.G.lineStyle(10, 0xffffff);
		this.G.moveTo(windowbounds[0] / 2, 5);
		drawDashLine(this.G, [windowbounds[0] / 2, 0], windowbounds[0] / 2, windowbounds[1]);
		console.log('scene drawn')
	}

	drawScore = () => {
		console.log('Score:', this.score.toString());
		this.app.stage.removeChild(this.P1score);
		this.P1score = new Pixi.Text(this.score[0].toString(), {
			fontFamily: 'Teko',
			fontSize: 75,
			fill: 'white',
			align: 'center',
		});
		this.P1score.anchor.set(0.5)
		this.P1score.position.set(Math.floor(4 * windowbounds[0] / 7), Math.floor(windowbounds[1] / 7));
		this.P1score.resolution = 2;
		this.app.stage.addChild(this.P1score);

		this.app.stage.removeChild(this.P2score);
		this.P2score = new Pixi.Text(this.score[1].toString(), {
			fontFamily: 'Teko',
			fontSize: 75,
			fill: 'white',
			align: 'center',
		});
		this.P2score.anchor.set(0.5)
		this.P2score.position.set(Math.floor(3 * windowbounds[0] / 7), Math.floor(windowbounds[1] / 7));
		this.P2score.resolution = 2;
		this.app.stage.addChild(this.P2score);
	}

	//draws win or tie based on scores, stops app loop
	endGame = () => {
		//OUTLINE: emit gameEnd event, refactor func to be on gameEnd event
		this.gameOver = true;

		this.app.ticker.remove(this._updatefuncpointer)

		this.drawScore();
		this.props.domTimer(true, false)
		if (this.score[0] === this.score[1]) { //tie game
			console.log("game end on TIE")
			const tieText1 = new Pixi.Text("TIE", {
				fontFamily: 'Teko',
				fontSize: 100,
				fill: 'white',
				align: 'center',
			})
			const tieText2 = new Pixi.Text("TIE", {
				fontFamily: 'Teko',
				fontSize: 100,
				fill: 'white',
				align: 'center',
			})

			tieText1.anchor.set(0.5)
			tieText1.position.set(Math.floor(windowbounds[0] / 4), Math.floor(windowbounds[1] / 2));
			tieText1.resolution = 1;
			this.app.stage.addChild(tieText1);

			tieText2.anchor.set(0.5)
			tieText2.position.set(Math.floor(3 * windowbounds[0] / 4), Math.floor(windowbounds[1] / 2));
			tieText2.resolution = 2;
			this.app.stage.addChild(tieText2);
		}
		else {
			console.log("game end on WIN")
			const winText = new Pixi.Text("WIN", {
				fontFamily: 'Teko',
				fontSize: 100,
				fill: 'white',
				align: 'center',
			})
			winText.anchor.set(0.5)
			//set to the side of the winner
			winText.position.set(Math.floor(this.score[0] < this.score[1] ? windowbounds[0] / 4 : 3 * windowbounds[0] / 4), Math.floor(windowbounds[1] / 2));
			winText.resolution = 2;
			this.app.stage.addChild(winText);
		}
	}

	updatePaddle1Pos_mouse = (mEvent1: any) => {

		let bounds = mEvent1.target.getBoundingClientRect();
		//console.log("bounds.top: " + bounds.top)

		//console.log("abs mouse y pos:" + mEvent1.clientY);
		let y: number = mEvent1.clientY - bounds.top;


		if (this.paddle1) { this.paddle1.updatePos_mouse(y); }
		socket.emit('GEVENT', 'MEVENT', { player: (this.props.isCreator ? 'p1' : 'p2'), mPos: y });
		//console.log('sent mouse event');
	}

	updatePaddle2Pos_network = (mPosP2: number) => {
		// called with Mevent given over soecket
		if (this.paddle2) { this.paddle2.updatePos_mouse(mPosP2) }
	}

	updateGame = (delta: number) => {
		// use delta to create frame-independent transform
		//this.ball.updatePos(delta);
		this.drawAll();
	}

	drawAll = () => {
		this.ball.draw();
		this.paddle1.draw();
		this.paddle2.draw();
	}

	//Stop the Application when unmounting.
	componentWillUnmount() {
		this.app.stop();
	}

	handlePress = (E: KeyboardEvent) => {
		switch (E.key) {
			case "Escape":
				if (!this.gameOver) { //only close if game is not over
					console.log("Game Closing on Escape")
					socket.emit('GEVENT', 'ESCAPE');
					this.gameOver = true;
				}
				break;
			default: //pass
		}
	}

	//Render the div that will contain the Pixi Renderer.
	render() {
		let component = this;
		document.addEventListener('keyup', (e) => { this.handlePress(e) });
		return (
			<div className="GameFrameWrapper">
				<div ref={(thisDiv: HTMLDivElement) => { component.gameCanvas = thisDiv }}
					onMouseMove={(e) => { component.updatePaddle1Pos_mouse(e); }}
				/>
			</div>
		); //
	}
}

export default GameBase;
