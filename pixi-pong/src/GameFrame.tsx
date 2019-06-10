import * as React from 'react';
import * as Pixi from 'pixi.js';

const windowbounds: number[] = [600, 450];
const bSize = 20;
const pSize = [10, 70];
const pOffset = 3;

class pongball {
	g: Pixi.Graphics
	pos: number[]
	Vx: number
	Vy: number
	rectBounds: number[][]
	cFlag: String
	constructor(props: any) {
		this.g = new Pixi.Graphics();
		this.pos = props.pos;
		this.Vx = props.Vx;
		this.Vy = props.Vy;
		//rectbounds is pos +- size/2
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];
		this.cFlag = ""
	}

	//handles bouncing and collision detection, sets collision flag on player loss
	updatePos = (delta: number, PaddleYPos_both: number[]) => {
		//console.log("pongball updated")
		this.pos[0] += this.Vx * delta;
		this.pos[1] += this.Vy * delta;
		this.rectBounds = [[this.pos[0] - bSize / 2, this.pos[1] - bSize / 2], [this.pos[0] + bSize / 2, this.pos[1] + bSize / 2]];

		// Collision detection //
		// bounces off floor and ceiling
		if (this.rectBounds[0][1] < 0 || this.rectBounds[1][1] > windowbounds[1]) {
			console.log("floor coll")
			this.Vy = -this.Vy; //invert Vy on ceiling or floor collison
		}
		//NOTE: this logic is frail bc the paddle might collide on multiple frames
		//		  Bounces off left paddle logic: it needs to be on or behind the paddle and within the rectangle height of the paddle
		else if ((this.rectBounds[0][0] <= pSize[0] + pOffset)&&(PaddleYPos_both[0] <= this.rectBounds[0][1] && this.rectBounds[1][1]<= PaddleYPos_both[0]+pSize[1])){
			console.log("P1 hit")
			this.Vx = -this.Vx
		}
		//		  Bounces off right paddle logic:
		else if ((this.rectBounds[0][0] >= windowbounds[0] -(pSize[0] + pOffset))&&(PaddleYPos_both[1] <= this.rectBounds[0][1] && this.rectBounds[1][1]<= PaddleYPos_both[1]+pSize[1])){
			console.log("P1 hit")
			this.Vx = -this.Vx
		}
		//sets P1L or P2L cFlag when it hits goals:
		else if (this.rectBounds[0][0] < 0 || this.rectBounds[1][0] > windowbounds[0]) {
			if(!this.cFlag){
				console.log("wall coll");
				this.cFlag = (this.pos[0] < 0 ? "P1":"P2")+"L";
			}
			this.Vx = 0;
			this.Vy = 0;
			//this.Vx = -this.Vx;
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
		this.yPos = Math.max(event.clientY-342, 0); //NOTE: this just kinda works
		this.yPos = Math.min(this.yPos, windowbounds[1]-pSize[1]);
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


interface IMainProps { }
interface IMainState { }
class GameFrame extends React.Component<IMainProps, IMainState>{
	app: Pixi.Application
	gameCanvas: HTMLDivElement
	HasBegun: boolean
	ball: pongball
	paddle1: paddle
	//paddle2: paddle
	props: any
	G: Pixi.Graphics
	constructor(props: any) {
		super(props);
		this.props = props;
		this.state = {
			score: [0, 0]
		};
		this.G = new Pixi.Graphics();
	}
	// After mounting, add the Pixi Renderer to the div and start the Application.
	componentDidMount() {
		this.app = new Pixi.Application({ width: windowbounds[0], height: windowbounds[1], backgroundColor: 0x000000, antialias: true });
		this.gameCanvas.appendChild(this.app.view);
		this.app.start(); //start renderer;
	}

	beginGame = () => {
		console.log("begingame called");
		this.G.clear();
		if(this.HasBegun){
			this.ball.g.clear();
			this.paddle1.g.clear();
			//this.paddle2.g.clear();
			delete this.ball;
			delete this.paddle1;
			//delete this.paddle2
		}
		
		this.HasBegun = true;
		this.ball = new pongball({
			size: 20,
			pos: [300, 225],
			Vx: -5,
			Vy: 2
		});
		this.paddle1 = new paddle({
			xPos: pOffset
		});
		this.app.stage.addChild(this.ball.g);
		this.app.stage.addChild(this.paddle1.g);
		//this.app.stage.addChild(this.paddle2.g);

		// Listen for animate update
		this.app.ticker.add((delta) => {
			this.updateGame(delta);
		});
	}

	drawScene(){
		//TODO: WRITEME dotted line and scores based on game state
	}

	updatePaddles = (event: any) => {
		if(this.HasBegun) this.paddle1.updatePos_mouse(event);
		//this.Paddle2.update(event);
	}

	updateGame = (delta: number) => {
		// use delta to create frame-independent transform
		this.ball.updatePos(delta, [this.paddle1.yPos]); //, this.Paddle2.yPos]);
		this.drawAll(); 
	}

	drawAll = () => {
		this.ball.draw();
		this.paddle1.draw();
		//todo: draw paddles
	}

	//Stop the Application when unmounting.
	componentWillUnmount() {
		this.app.stop();
	}

	handlePress = (key: any) => {
		switch (key.charCode) {
			//TODO: Write
			default: //pass
		}
	}

	//Render the div that will contain the Pixi Renderer.
	render() {
		let component = this;
		return (
			<div className="GameFrameWrapper">
				<button onClick={() => { this.beginGame(); this.props.buttonfunc(); }}>Begin Game!</button>
				<div ref={(thisDiv: HTMLDivElement) => { component.gameCanvas = thisDiv }}
					onMouseMove={(e) => { component.updatePaddles(e); }} />
			</div>
		); //onKeyPress = {(e) => {this.handlePress(e)}}/>
	}
}

export default GameFrame;
