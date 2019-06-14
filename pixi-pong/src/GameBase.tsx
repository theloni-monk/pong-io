import * as React from 'react';
import * as Pixi from 'pixi.js';

//constants:
const winVal = 7;
const windowbounds: number[] = [700, 500];
const bSize = 16;
const pSize = [16, 90];
const pOffset = 30;
//TODO: add sounds on collisions and various events
//TODO: load more pixelated font

class pongball {
	g: Pixi.Graphics
	pos: number[]
	Vx: number
	Vy: number
	rectBounds: number[][]
	cFlag: String
	pBounceInvin: number
	fBounceInvin: number
	constructor(props: any) {
		this.g = new Pixi.Graphics();
		this.pos = props.pos;
		this.Vx = props.Vx;
		this.Vy = props.Vy;
		//rectbounds is pos +- size/2
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
		this.cFlag = ""
		this.pBounceInvin = 0;
		this.fBounceInvin = 0;
	}

	//handles bouncing and collision detection, sets collision flag on player loss
	updatePos = (delta: number, PaddleYPos_both: number[]) => {
		//console.log("pongball updated")
		this.pos[0] += this.Vx * delta;
		this.pos[1] += this.Vy * delta;
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];

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

	draw = () => {
		//console.log("pongball drawn")
		// Rectangle + line style 2
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
	cFlag: String
	constructor(props: any) {
		this.xPos = props.xPos;
		this.yPos = 0;

		this.g = new Pixi.Graphics();
		this.rectBounds = [[this.xPos, this.yPos], [this.xPos + pSize[0], this.yPos + pSize[1]]];
	}
	updatePos_mouse = (event: any) => {
		//console.log("Coordinates: (" + event.clientX + "," + event.clientY + ")");
		this.yPos = Math.max(event.clientY - 342, 0); //NOTE: this just kinda works
		this.yPos = Math.min(this.yPos, windowbounds[1] - pSize[1]);
		//console.log("yPos: "+this.yPos);
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

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

interface GBProps { 
	buttonfunc: any
}
interface GBState {}
class GameBase extends React.Component<GBProps, GBState>{
	protected app: Pixi.Application
	protected _updatefuncpointer: any
	protected gameCanvas: HTMLDivElement
	protected G: Pixi.Graphics
	private beginButton: Pixi.Text
	private P1score: Pixi.Text
	private P2score: Pixi.Text
	public scores: number[]
	public gameOver: boolean
	protected ball: pongball
	public ballVel: number
	protected paddle1: paddle
	//protected paddle2: paddle

	constructor(props: any) {
		super(props);
		this.scores = [0, 0];
		this.G = new Pixi.Graphics();
		this.ballVel = 3.75; // we immediately add 0.25
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

		this.initGame();
	}

	//THOUGHT: here exchange Win Const 
	initGame = () => {
		console.log("begingame called");
		this.G.clear();

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

		this.beginButton.on('pointerdown', () => {
			console.log("beginButton triggered")

			this._updatefuncpointer = (delta: number) => { this.updateGame(delta) }; //create update timer
			this.app.ticker.add(this._updatefuncpointer)
			this.props.buttonfunc(); //start timer in DOM
			this.app.stage.removeChild(this.beginButton);

			this.drawScene();
			this.drawScore();
			//this.button.destroy(); // destroy the button
		})
		this.paddle1 = new paddle({
			xPos: pOffset
		});
		//this.paddle2 = new paddle({
		//	  xPos: windowbounds[0]-pOffset
		//});
		this.app.stage.addChild(this.paddle1.g);

		// create ball and set velocities in a rand direction:
		let dir = Math.floor(Math.random() * 2) ? 1 : -1
		let angle = Math.ceil(Math.random() * (Math.PI)); // send the ball at velocity ballVel in random angle
		this.ball = new pongball({
			size: 20,
			pos: [windowbounds[0] / 2, windowbounds[1] / 2],
			Vx: this.ballVel * Math.cos(angle) * dir,
			Vy: this.ballVel * Math.sin(angle) * dir
		});

		this.app.stage.addChild(this.ball.g);
	}

	//THOUGHT: on loadstage exchange scores to see if sync error occured
	async loadStage() {
		this.app.ticker.stop(); //stop updates
		//console.log("loadStage called")

		if (this.ball) {
			this.ball.g.clear();
			this.app.stage.removeChild(this.ball.g);
			delete this.ball;
		}
		this.ballVel += 0.2; //each level gets faster

		this.drawScene();
		this.drawScore();

		this.props.buttonfunc(true, false); // pause timer in DOM
		await sleep(300); // subltle pause lets users relax
		this.props.buttonfunc(); // unpause timer in DOM

		// create and set the ball in a rand direction:
		let dir = Math.floor(Math.random() * 2) ? 1 : -1
		let angle = Math.ceil(Math.random() * (Math.PI)); // send the ball at velocity ballVel in random angle
		this.ball = new pongball({
			size: 20,
			pos: [windowbounds[0] / 2, windowbounds[1] / 2],
			Vx: this.ballVel * Math.cos(angle) * dir,
			Vy: this.ballVel * Math.sin(angle) * dir
		});

		this.app.stage.addChild(this.ball.g);

		this.app.ticker.start()
	}

	//sends endgame
	endGame = () => {
		this.gameOver = true;

		this.app.ticker.remove(this._updatefuncpointer)

		this.drawScore();
		this.props.buttonfunc(true, false)
		if (this.scores[0] === this.scores[1]) { //tie game
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
			winText.position.set(Math.floor(this.scores[0] < this.scores[1] ? windowbounds[0] / 4 : 3 * windowbounds[0] / 4), Math.floor(windowbounds[1] / 2));
			winText.resolution = 2;
			this.app.stage.addChild(winText);
		}
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

			for (
				;
				Math.abs(currentPosition.x) < absValues.toX ||
				Math.abs(currentPosition.y) < absValues.toY;
			) {
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

	drawScore() {
		this.app.stage.removeChild(this.P1score);
		this.P1score = new Pixi.Text(this.scores[0].toString(), {
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
		this.P2score = new Pixi.Text(this.scores[1].toString(), {
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

	//TODO: implement DNS lookup && p2p network streaming 
	//TODO: inheirit socket connected to match room
	//sends local mouse event
	updatePaddle1Pos_mouse = (Mevent1: any) => {
		if (this.paddle1) { this.paddle1.updatePos_mouse(Mevent1); }
		//send Mouse event over socket
		//this.paddle2.update(event);
	}

	updateGame = (delta: number) => {
		// use delta to create frame-independent transform
		this.ball.updatePos(delta, [this.paddle1.yPos]); //, this.Paddle2.yPos]);
		this.drawAll();
		if (this.ball.cFlag) {
			this.scores[this.ball.cFlag === 'P1L' ? 0 : 1]++;
			//TODO: inherit win const
			this.scores[this.ball.cFlag === 'P1L' ? 0 : 1] < winVal ? this.loadStage() : this.endGame();

		}
	}

	drawAll = () => {
		this.ball.draw();
		this.paddle1.draw();
		//this.paddle2.draw();
		//todo: draw paddles
	}

	//Stop the Application when unmounting.
	componentWillUnmount() {
		this.app.stop();
	}

	handlePress = (E: KeyboardEvent) => {
		console.log("handlepress called: " + E.toString())
		switch (E.key) {

			case "Escape":
				if (!this.gameOver) { //only close if game is not over
					console.log("Game Closing on Escape")
					this.endGame();
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
