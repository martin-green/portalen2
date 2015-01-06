// Portalen av Martin Green (martin@famgreen.se), 1997.
// portad från Java applet till javascript, 2015
// Portalens övre vänstra fundament: 144;51 , Nedre: 149;119
// Portalens övre högra   fundament: 171;51 , Nedre: 171;119
// Vägens överkant: ;76 , nederkant: ;111
var nRoadBottom_y = 113;
var nRoadTop_y = 90;
var nPortalLoc_x = 155;
var nPortalTop_y = 66;
var nPortalBottom_y = 133;
var nGrassLoc_x = 340;
var ptPortal1_x = 150;
var ptPortal1_y = 45;
var ptPortal2_x = 170;
var ptPortal2_y = 119;
var carWidth = 64;
var carHeight = 32;
var speed = 0.25;

var debug = false;
var score = 0;
var lives = 3;

var canvas;
var context;
var imageBackground = new Image();
imageBackground.onload = function() { loadDone(); };
imageBackground.src = "back.gif";
var sopbil = new Bil(0, 'sopbil_right.gif', 'sopbil_left.gif', false);
var sugbil = new Bil(0, 'sugbil_right.gif', 'sugbil_left.gif', true);
var portal = new Portal();
var prutt = new Audio("fart.mp3");
var heygang = new Audio("heygang.mp3");
var honk = new Audio("hornhonk.mp3");
var crash = new Audio("crash.mp3");
var flush = new Audio("flush.mp3");
var gameOverLine = 0;

function HtmlButton(text, x, y, wx, wy, onclick)
{
	var btn = document.createElement("BUTTON");
	btn.style.position = "absolute";
	btn.style.left = x + "px";
	btn.style.top = y + "px";
	btn.style.width = wx + "px";
	btn.style.height = wy + "px";
	btn.style.zIndex = 1;
	btn.appendChild(document.createTextNode(text));
	document.body.appendChild(btn);
	btn.onclick = onclick;
}
function HtmlInput(text, x, y, wx, wy, id)
{
	var input = document.createElement("INPUT");
	input.setAttribute('id', id);
	input.setAttribute('value', text);
	input.setAttribute('type', 'text');
	input.setAttribute('maxlength', 10);
	input.style.position = "absolute";
	input.style.left = x + "px";
	input.style.top = y + "px";
	input.style.width = wx + "px";
	input.style.height = wy + "px";
	input.style.font = "20px Arial";
	input.style.zIndex = 1;
	document.body.appendChild(input);
}
var Gui =
{
	buttons: [],
	click: function(x, y)
	{
		for (var b=0; b < Gui.buttons.length; ++b) Gui.buttons[b].tryClick(x, y);
		if (lives === 0 && gameOverLine === canvas.height) reset();
	},
	draw: function(ctx)
	{
		for (var b=0; b < Gui.buttons.length; ++b) Gui.buttons[b].draw(ctx);
	}
};
function Button(text, x, y, wx, wy, onclick)
{
	this.onclick = onclick;
	this.x = x;
	this.y = y;
	this.wx = wx;
	this.wy = wy;
	this.text = text;
	this.clickedAnimationCounter = 0;
	this.draw = function(ctx) 
	{
		var myGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y+this.wy);
		var isClicked = this.clickedAnimationCounter > 0;
		if (isClicked)
		{
			myGradient.addColorStop(0, '#ccc');
			myGradient.addColorStop(0.5, '#ddd');
			myGradient.addColorStop(1, '#eee');
			--this.clickedAnimationCounter;
		}
		else
		{
			myGradient.addColorStop(0, '#eee');
			myGradient.addColorStop(0.5, '#ddd');
			myGradient.addColorStop(1, '#ccc');
		}
		ctx.fillStyle = myGradient;
		ctx.fillRect(this.x, this.y, this.wx, this.wy);
		ctx.fillStyle = "#000";
		ctx.font = "16px Arial";
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(this.text, this.x+(this.wx/2)+(isClicked ? 1 : 0), this.y+(this.wy/2)+(isClicked ? 1 : 0));
		ctx.beginPath();
		ctx.strokeStyle = "#000";
		ctx.strokeRect(this.x, this.y, this.wx, this.wy);
		ctx.stroke();
	};
	this.hit = function(x, y) { return (x >= this.x && x <= this.x+this.wx && y >= this.y && y <= this.y+this.wy); };
	this.tryClick = function(x, y)
	{
		if (this.hit(x, y))
		{
			this.clickedAnimationCounter = 16;
			this.onclick();
		}
	};
	Gui.buttons.push(this);
}
function reset()
{
	score = 0;
	lives = 3;
	sopbil.reset();
	sugbil.reset();
	gameOverLine = 0;
	speed = 0.25;
	portal.vinkel = 0;
	context.fillStyle = "white";
	context.fillRect(0, 0, canvas.width, canvas.height);
}
window.onkeydown = KeyDown;
window.onkeyup = KeyUp;
function generateRandomInt(max)
{
	return Math.floor(Math.random() * max);
}
var totalLoadCount = 0;
var expectedLoadCount = 3;
function loadComplete() {}
function loadDone()
{
	if (++totalLoadCount === expectedLoadCount)
		loadComplete();
}
var frameCounter = 0;
function update(t)
{
	window.requestAnimationFrame(update);
	++frameCounter;
	if (debug) drawDebug(context, t);
	drawBackground(context);
	drawScore(context);
	drawLives(context);
	if (totalLoadCount < expectedLoadCount)
	{
		context.font = "32px Arial";
		context.fillStyle = "#000";
		context.fillText("Laddar: " + totalLoadCount + "/" + expectedLoadCount, canvas.width/4, nRoadTop_y+15);
		return;
	}
	sopbil.drawFirst(context);
	if (sopbil.movingRight)
	{	
		sugbil.draw(context, t);
		sopbil.draw(context, t);
	}
	else
	{
		sopbil.draw(context, t);
		sugbil.draw(context, t);
	}
	portal.draw(context);
	if (lives === 0)
	{
		drawGameOver(context);
		return;
	}
	if (isPressingUp)
	{
		portal.Open();
		isPressingUp = false;
	}
	if (isPressingDown) 
	{
		portal.Close();
		isPressingDown = false;
	}
	sopbil.update(t);
	sugbil.update(t);
	portal.update(t);
	trafficControl();
	Gui.draw(context);
	if (frameCounter % 600 === 0) speed *= 1.05;
}
function trafficControl()
{
	if (sopbil.movingRight === sugbil.movingRight && sugbil.hits(sopbil))
	{
		if (sopbil.movingRight)
		{
			if (sugbil.x > sopbil.x) sopbil.stop(); else sugbil.stop();
		}
		else
		{
			if (sugbil.x < sopbil.x) sopbil.stop(); else sugbil.stop();
		}
	}
}
function kill()
{
	if (lives > 0) --lives;
}
function drawBackground(ctx)
{
	ctx.drawImage(imageBackground,0,0,imageBackground.width,imageBackground.height);
}
function drawScore(ctx) 
{
	ctx.font = "32px Arial";
	ctx.fillStyle = "#000";
	ctx.fillText("" + score, canvas.width-80, 40);
}
function drawLine(ctx, x1, y1, x2, y2)
{
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
}
function drawGameOver(ctx)
{
	if (gameOverLine === 0)
	{
		prutt.loop = true;
		prutt.play();
	}
	if (gameOverLine < canvas.height)
	{
		if (++gameOverLine === canvas.height) 
		{
			prutt.loop = false;
		}
	}
	ctx.beginPath();
	ctx.fillStyle = "darkbrown";
	ctx.moveTo(0, canvas.height);
	ctx.lineTo(canvas.width, canvas.height);
	ctx.lineTo(canvas.width, canvas.height-gameOverLine);
	ctx.lineTo(0, canvas.height-gameOverLine);
	ctx.closePath();
	ctx.fill();
	context.font = "40px Arial";
	context.fillStyle = "#000";
	context.fillText("Game Over", canvas.width/4, nRoadTop_y);
	context.fillText("Poäng:" + score, canvas.width/4, nRoadTop_y+45);
}
function drawLives(ctx)
{
	for (var n=0; n < 3; n++)
	{
		ctx.beginPath();
		ctx.strokeStyle = "#000";
		drawLine(ctx, 10+45*n, 250, 30+45*n, 240);
		drawLine(ctx, 30+45*n, 240, 50+45*n, 250);
		drawLine(ctx, 15+45*n, 248, 15+45*n, 260);
		drawLine(ctx, 45+45*n, 248, 45+45*n, 260);
		ctx.stroke();
	}
	for (var n=0; n < 3-lives; n++)
	{
		ctx.beginPath();
		ctx.strokeStyle = "#f00";
		drawLine(ctx, 10+45*n, 240, 50+45*n, 260);
		drawLine(ctx, 10+45*n, 260, 50+45*n, 240);
		ctx.stroke();
	}
}
function Bil(x,imgurl1,imgurl2,allowedToPassPortal)
{
	var _this = this;
	this.shouldPass = allowedToPassPortal;
	this.x = x;
	this.y = nRoadBottom_y-30;
	this.movingRight = true;
	this.stopCounter = 0;
	this.crashedAnimationCounter = 0;
	this.havePayload = false;
	this.loadcount = 0;
	this.img = [new Image(), new Image()];
	this.img[1].onload = this.img[0].onload = function() 
	{
		_this.loadcount++;
		if (_this.loadcount === 2)
		{
			loadDone();
		}
	};
	this.img[0].src = imgurl1;
	this.img[1].src = imgurl2;
	this.reset = function()
	{
		this.x = 0;
		this.stop();
		this.movingRight = true;
		this.crashedAnimationCounter = 0;
		this.havePayload = false;
	}
	this.drawFirst = function(ctx, t) 
	{
		if (!this.shouldPass && this.x > nGrassLoc_x && this.movingRight)
		{
			this.drawBurnout(ctx);
		}
	};
	this.draw = function(ctx, t) 
	{
		ctx.drawImage(this.img[this.movingRight ? 0 : 1], this.x-carWidth, this.y-(this.movingRight ? 0 : 20));
		if (--this.crashedAnimationCounter > 0) this.drawCrash(ctx, t);
	};
	this.getDebugString = function()
	{
		var s =  "" + this.x.toFixed(1) + " " + (this.movingRight ? ">" : "<") + " :";
		if (this.isCrashed()) s += "c";
		if (this.havePayload) s += "p";
		if (this.isStopped()) { s += "s:" + this.stopCounter; }
		return s;
	};
	this.isCrashed = function() { return this.crashedAnimationCounter > 0; };
	this.crash = function() 
	{ 
		this.crashedAnimationCounter = 200;
		this.havePayload = false;
		crash.play();
		kill();
	};
	this.stop = function() { this.stopCounter = generateRandomInt(300); };
	this.isStopped = function() { return this.stopCounter > 0; };
	this.update = function(t)
	{
		if (this.isCrashed()) return;
		if (this.isStopped())
		{
			--this.stopCounter;
			// if (Math.random() > 0.99) this.stopCounter = 0; // attempt to start
			return;
		}
		this.x += speed * (this.movingRight ? 1 : -1);
		if (this.x >= canvas.width) 
		{
			this.movingRight = false;
			if (this.havePayload = this.shouldPass) // assign and test at once
			{
				flush.play();
			}
			else
			{
				heygang.play();
				kill();
				this.movingRight = false;
				this.havePayload = false;
			}
		}
		if (this.x <= 0) 
		{
			this.stop();
			this.movingRight = true;
			if (this.havePayload)
			{
				++score;
				this.havePayload = false;
			}
		}
		var position = Math.floor(this.x) - (this.movingRight ? 0 : carWidth);
		if (position === ptPortal1_x)
		{
			if (!portal.IsOpen() && (!this.movingRight || this.shouldPass)) // crash on the return, or sugbil
			{
				this.movingRight = false;
				this.x -= 1; // bugfix: move away to not crash again
				this.crash();
			}
			if (!this.shouldPass && !portal.IsOpen())
			{
				if (this.movingRight)
				{
					this.movingRight = false;
					this.havePayload = true;
				}
			}
		}
	}; // update end 
	this.drawBurnout = function(ctx)
	{
		ctx.beginPath();
		ctx.strokeStyle = 'black';
		ctx.moveTo(nGrassLoc_x-carWidth+4, this.y+carHeight-5);
		ctx.lineTo(this.x-carWidth+4, this.y+carHeight-5);
		ctx.stroke();
		ctx.beginPath();
		ctx.strokeStyle = 'black';
		ctx.moveTo(nGrassLoc_x-carWidth, this.y-10+carHeight-5);
		ctx.lineTo(this.x-carWidth, this.y-10+carHeight-5);
		ctx.stroke();
	};
	this.drawCrash = function(ctx, t)
	{
		var x = Math.floor(this.x) - (this.movingRight ? 0 : carWidth);
		//    __/\__
		//    \    /
		//     |/\|
		//		
		ctx.beginPath();
		ctx.fillStyle = ["#ff0","#f30"][Math.floor((t / 100)%2)];
		ctx.moveTo(x, this.y-15);
		ctx.lineTo(x+5, this.y-5);
		ctx.lineTo(x+20, this.y-5);
		ctx.lineTo(x+10, this.y+5);
		ctx.lineTo(x+12, this.y+20);
		ctx.lineTo(x, this.y+10);
		ctx.lineTo(x-12, this.y+20);
		ctx.lineTo(x-10, this.y+5);
		ctx.lineTo(x-20, this.y-5);
		ctx.lineTo(x-5, this.y-5);
		ctx.closePath();
		ctx.fill();
	};
	this.hits = function(bil)
	{
		var intersection = Math.abs(bil.x - this.x);
		return bil.x > 0 && this.x > 0 && intersection <= carWidth;
	};
}

var DarkRed = '#800000';
var White = '#fff';

function Portal()
{
	this.vinkel = 0;
	this.speed = 0.2;
	this.Open = function() 
	{
		this.bOpening = true;
		this.bClosing = false;
	};
	this.Close = function() 
	{
		this.bOpening = false;
		this.bClosing = true;
	};
	this.IsOpen = function() 
	{
		return this.vinkel > 40;
	};
	this.update = function() 
	{
		if (this.bOpening) 
		{
			if (this.vinkel >= 90) this.bOpening = false;
			else this.vinkel += this.speed;
		} 
		else if( this.bClosing ) 
		{
			if( this.vinkel <= 0 ) this.bClosing = false;
			else this.vinkel -= this.speed;
		}
	};
	this.draw = function(ctx)
	{
		var x2 = ptPortal1_x;
		var y2 = ptPortal2_y;
		var nLength = ptPortal2_y - ptPortal1_y;
		var x1 = ptPortal1_x + (nLength/2.0 * Math.sin((this.vinkel + 30) * Math.PI / 360.0));
		var y1 = ptPortal2_y - (nLength/2.0 * Math.cos((this.vinkel + 30) * Math.PI / 360.0));

		ctx.beginPath();
		ctx.fillStyle = DarkRed;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.lineTo(x2+20, y2);
		ctx.lineTo(x1+20, y1);
		ctx.closePath();
		ctx.fill();

		ctx.beginPath();
		ctx.strokeStyle = White;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.beginPath();
		ctx.strokeStyle = White;
		ctx.moveTo(x1+21, y1);
		ctx.lineTo(x2+21, y2);
		ctx.stroke();

		x2 = x1;
		y2 = y1;

		x1 = x1 + (nLength/2.0 * Math.sin((this.vinkel - 30) * Math.PI / 360.0));
		y1 = y1 - (nLength/2.0 * Math.cos((this.vinkel - 30) * Math.PI / 360.0));

		ctx.beginPath();
		ctx.fillStyle = DarkRed;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.lineTo(x2+20, y2);
		ctx.lineTo(x1+20, y1);
		ctx.closePath();
		ctx.fill();

		ctx.beginPath();
		ctx.strokeStyle = White;
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.beginPath();
		ctx.strokeStyle = White;
		ctx.moveTo(x1+21, y1);
		ctx.lineTo(x2+21, y2);
		ctx.stroke();
	};
}

var isPressingUp = false;
var isPressingDown = false;
function KeyDown(e)
{
    e = e || window.event;
    if (e.keyCode === 38) isPressingUp = true;
    if (e.keyCode === 40) isPressingDown = true;
}
function KeyUp(e)
{
	e = e || window.event;
	if (e.keyCode === 38) isPressingUp = false;
	if (e.keyCode === 40) isPressingDown = false;
}
function onTouchStart(e)
{
	for(var i = 0; i < e.touches.length; i++)
	{
		Gui.click(e.touches[i].screenX, e.touches[i].screenY);
	}
}
function drawDebug(ctx, t)
{
	ctx.fillStyle = "white";
	ctx.fillRect(280, 200, 200, 200);
	ctx.fillStyle = "#000";
	ctx.font = "12px Arial";
	ctx.fillText("sopbil:" + sopbil.getDebugString(), 280, 220);
	ctx.fillText("sugbil:" + sugbil.getDebugString(), 280, 235);
	ctx.fillText("portal:" + portal.vinkel.toFixed(1), 280, 250);
	ctx.fillText("speed=" + speed.toFixed(3), 280, 265);
}
function getPosition(element) 
{
	var xPosition = 0;
	var yPosition = 0;
	while (element) 
	{
		xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
		yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
		element = element.offsetParent;
	}
	return { x: xPosition, y: yPosition };
}
function onClick(e)
{
    var parentPosition = getPosition(e.currentTarget);
    var x = e.clientX - parentPosition.x;
    var y = e.clientY - parentPosition.y;
	Gui.click(x, y);
}

function init()
{
	canvas = document.getElementById('canvas');
	context = canvas.getContext('2d');
	new Button("Öppna", 200, 210, 80, 35, function() {isPressingUp=true;});
	new Button("Stäng", 200, 250, 80, 35, function() {isPressingDown=true;});
	if ('ontouchstart' in document.documentElement)
	{
		canvas.addEventListener('touchstart', onTouchStart, false); 
	}
	else
	{
		canvas.addEventListener('click', onClick, false);
	}
	document.body.oncontextmenu = function() { return false; } // disable the popup menu
	
	reset();
	window.requestAnimationFrame(update);
}

window.onload = init;
