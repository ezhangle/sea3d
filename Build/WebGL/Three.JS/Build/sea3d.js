/**
 * 	SEA3D.JS - SEA3D SDK
 * 	Copyright (C) 2015 Sunag Entertainment 
 * 
 * 	http://sea3d.poonya.com/
 */

var SEA3D = { VERSION : 16590, REVISION : 3 }

console.log( 'SEA3D v' + SEA3D.VERSION + ' r' + SEA3D.REVISION );

//
//	Timer
//

SEA3D.Timer = function() {
	this.time = this.start = this.getTime();
}

SEA3D.Timer.prototype.getDeltaTime = function() {
	return this.getTime() - this.time;
}

SEA3D.Timer.prototype.getTime = function() {
	return new Date().getTime();
}

SEA3D.Timer.prototype.getElapsedTime = function() {
	return this.getTime() - this.start;
}

SEA3D.Timer.prototype.update = function() {
	this.time = this.getTime();
}

//
//	STREAM : STANDARD DATA-IO ( LITTLE-ENDIAN )
//

SEA3D.Stream = function(buffer) {	
	this.position = 0;
	this.set( buffer || new Uint8Array() );
}

SEA3D.Stream.bufferToBase64 = function(buffer) {
	var i = 0, 
		count = buffer.length,
		binary = "";
	
	while (i < count) 
		binary += String.fromCharCode( buffer[ i++ ] );
		
	return window.btoa(binary);
}

SEA3D.Stream.prototype.TWOeN23 = Math.pow(2, -23);
SEA3D.Stream.prototype.TWOeN52 = Math.pow(2, -52);
SEA3D.Stream.prototype.pow = Math.pow;

SEA3D.Stream.prototype.set = function(buffer) {
	this.buffer = buffer;
	this.length = buffer.length;	
}

SEA3D.Stream.prototype.readByte = function() {
	return this.buffer[this.position++] << 24 >> 24;
}

SEA3D.Stream.prototype.readUByte = function() {
	return this.buffer[this.position++];
}

SEA3D.Stream.prototype.readUBytes = function(len) {
	var bytes = new Uint8Array(len);
	for (var i=0;i<len;++i) bytes[i] = this.buffer[this.position++];
	return bytes;
}

SEA3D.Stream.prototype.readBool = function() {
	return this.readUByte() != 0;
}

SEA3D.Stream.prototype.readShort = function() {
	var b = this.readUShort();
	if (b > Math.pow(2, 15) - 1) {
		return b - Math.pow(2, 16);
	}
	return b;
}

SEA3D.Stream.prototype.readUShort = function() {	
	return this.readUByte() | (this.readUByte() << 8);
}

SEA3D.Stream.prototype.readUInt24 = function() {
	return this.readUByte() | (this.readUByte() << 8) | (this.readUByte() << 16);
}

SEA3D.Stream.prototype.readUInt = function() {
	return this.readUByte() | (this.readUByte() << 8) | (this.readUByte() << 16) | (this.readUByte() << 24);
}

SEA3D.Stream.prototype.readUInteger = function()
{
	var v = this.readUByte(),
		r = v & 0x7F;
	
	if ((v & 0x80) != 0)
	{
		v = this.readUByte();
		r |= (v & 0x7F) << 7;
		
		if ((v & 0x80) != 0)
		{
			v = this.readUByte();
			r |= (v & 0x7F) << 13;
		}
	}
	
	return r;
}

SEA3D.Stream.prototype.readFloat = function() {
	var b4 = this.readUByte(),
		b3 = this.readUByte(),
		b2 = this.readUByte(),
		b1 = this.readUByte();
	var sign = 1 - ((b1 >> 7) << 1);                   // sign = bit 0
	var exp = (((b1 << 1) & 0xFF) | (b2 >> 7)) - 127;  // exponent = bits 1..8
	var sig = ((b2 & 0x7F) << 16) | (b3 << 8) | b4;    // significand = bits 9..31
	if (sig == 0 && exp == -127)
		return 0.0;
	return sign*(1 + this.TWOeN23*sig)*this.pow(2, exp);
}

SEA3D.Stream.prototype.readVector2 = function() {
	return { x: this.readFloat(), y: this.readFloat() }
}

SEA3D.Stream.prototype.readVector3 = function() {
	return { x: this.readFloat(), y: this.readFloat(), z: this.readFloat() }
}

SEA3D.Stream.prototype.readVector4 = function() {
	return { x: this.readFloat(), y: this.readFloat(), z: this.readFloat(), w: this.readFloat() }
}

SEA3D.Stream.prototype.readMatrix = function() {	
	var mtx = new Float32Array(16);
	
	mtx[0] = this.readFloat();
	mtx[1] = this.readFloat();
	mtx[2] = this.readFloat();
	mtx[3] = 0.0;
	mtx[4] = this.readFloat();
	mtx[5] = this.readFloat();
	mtx[6] = this.readFloat();
	mtx[7] = 0.0;
	mtx[8] = this.readFloat();
	mtx[9] = this.readFloat();
	mtx[10] = this.readFloat();
	mtx[11] = 0.0;
	mtx[12] = this.readFloat();
	mtx[13] = this.readFloat();
	mtx[14] = this.readFloat();
	mtx[15] = 1.0;

	return mtx;
}

SEA3D.Stream.prototype.readUTF = function(len) {
	return String.fromCharCode.apply(null, new Uint16Array(this.readUBytes(len)));
}

SEA3D.Stream.prototype.readExt = function() {
	return this.readUTF(4).replace(/\0/g, "");
}

SEA3D.Stream.prototype.readUTF8 = function() {
	return this.readUTF(this.readUByte());
}

SEA3D.Stream.prototype.readBlendMode = function() {
	return SEA3D.DataTable.BLEND_MODE[this.readUByte()];
}

SEA3D.Stream.prototype.toBase64 = function() {
	return SEA3D.Stream.bufferToBase64( this.data );
}

SEA3D.Stream.prototype.append = function(data) {
	var tmp = new Uint8Array( this.data.byteLength + data.byteLength );
	tmp.set( new Uint8Array( this.data ), 0 );
	tmp.set( new Uint8Array( data ), this.data.byteLength );
	this.data = tmp;
}

SEA3D.Stream.prototype.concat = function(position, length) {	
	return new SEA3D.Stream(this.buffer.subarray( position, position + length ));	
}

SEA3D.Stream.prototype.bytesAvailable = function() {
	return this.length - this.position;
}

//
//	Data Table
//

SEA3D.DataTable = {
	NONE : 0,
	
	// 1D = 0 at 31
	BOOLEAN : 1,
	
	BYTE : 2,
	UBYTE : 3,
	
	SHORT : 4,
	USHORT : 5,
	
	INT24 : 6,
	UINT24 : 7,
	
	INT : 8,
	UINT : 9,
	
	FLOAT : 10,
	DOUBLE : 11,
	DECIMAL : 12,
	
	// 2D = 32 at 63
	
	// 3D = 64 at 95
	VECTOR3D : 74,
	
	// 4D = 96 at 127
	VECTOR4D : 106,
	
	// Undefined Size = 128 at 256
	STRING_TINY : 128,
	STRING_SHORT : 129,
	STRING_LONG : 130
}

SEA3D.DataTable.BLEND_MODE =	[
	"normal","add","subtract","multiply","dividing","alpha","screen","darken",
	"overlay","colorburn","linearburn","lighten","colordodge","lineardodge",
	"softlight","hardlight","pinlight","spotlight","spotlightblend","hardmix",
	"average","difference","exclusion","hue","saturation","color","value"
]

SEA3D.DataTable.INTERPOLATION_TABLE =	[
	"normal","linear",
	"sine.in","sine.out","sine.inout",
	"cubic.in","cubic.out","cubic.inout",
	"quint.in","quint.out","quint.inout",
	"circ.in","circ.out","circ.inout",
	"back.in","back.out","back.inout",
	"quad.in","quad.out","quad.inout",
	"quart.in","quart.out","quart.inout",
	"expo.in","expo.out","expo.inout",
	"elastic.in","elastic.out","elastic.inout",
	"bounce.in","bounce.out","bounce.inout"
]

SEA3D.DataTable.readObject = function(data) {
	SEA3D.DataTable.readToken(data.readUByte(), data);
}

SEA3D.DataTable.readToken = function(type, data) {
	switch(type)
	{
		// 1D
		case SEA3D.DataTable.BOOLEAN:
			return data.readBool();
			break;
		
		case SEA3D.DataTable.UBYTE:
			return data.readUByte();
			break;
		
		case SEA3D.DataTable.USHORT:
			return data.readUShort();
			break;
		
		case SEA3D.DataTable.UINT24:
			return data.readUInt24();
			break;	
		
		case SEA3D.DataTable.UINT:
			return data.readUInt();
			break;
		
		case SEA3D.DataTable.FLOAT:
			return data.readFloat();
			break;
		
		// 3D
		case SEA3D.DataTable.VECTOR3D:
			return data.readVector3();
			break;	
		
		// 4D
		case SEA3D.DataTable.VECTOR4D:
			return data.readVector4();						
			break;
		
		// Undefined Values
		case SEA3D.DataTable.STRING_TINY:
			return data.readUTF8();
			break;
	}
	
	return null;
}

SEA3D.DataTable.readVector = function(type, data, out, length, offset) {			
	var size = SEA3D.DataTable.sizeOf(type), 
		i = offset * size, 
		count = i + (length * size);
	
	switch(type)
	{
		// 1D
		case SEA3D.DataTable.BOOLEAN:
			while (i < count) out[i++] = data.readBool() ? 1 : 0;						
			break;
		
		case SEA3D.DataTable.UBYTE:
			while (i < count) out[i++] = data.readUByte();						
			break;
		
		case SEA3D.DataTable.USHORT:
			while (i < count) out[i++] = data.readUShort();							
			break;
		
		case SEA3D.DataTable.UINT24:
			while (i < count) out[i++] = data.readUInt24();						
			break;	
		
		case SEA3D.DataTable.UINT:
			while (i < count) out[i++] = data.readUInt();						
			break;
		
		case SEA3D.DataTable.FLOAT:
			while (i < count) out[i++] = data.readFloat();						
			break;
		
		// 3D
		case SEA3D.DataTable.VECTOR3D:
			while (i < count) 		
			{
				out[i++] = data.readFloat();
				out[i++] = data.readFloat();
				out[i++] = data.readFloat();							
			}
			break;	
		
		// 4D
		case SEA3D.DataTable.VECTOR4D:
			while (i < count) 	
			{
				out[i++] = data.readFloat();
				out[i++] = data.readFloat();
				out[i++] = data.readFloat();
				out[i++] = data.readFloat();
			}
			break;
	}
}		

SEA3D.DataTable.sizeOf = function(kind) {
	if (kind == 0) return 0;
	else if (kind >= 1 && kind <= 31) return 1;
	else if (kind >= 32 && kind <= 63) return 2;
	else if (kind >= 64 && kind <= 95) return 3;
	else if (kind >= 96 && kind <= 125) return 4;			
	return -1;
}

//
//	Math
//

SEA3D.Math = {
	DEGREES : 180 / Math.PI,
	RADIANS : Math.PI / 180
}

SEA3D.Math.angle = function(val) {
	var ang = 180,
		inv = val < 0;
	
	val = (inv ? -val : val) % 360;
	
	if (val > ang)			
	{
		val = -ang + (val - ang);
	}
	
	return (inv ? -val : val);			
}

SEA3D.Math.lerpAngle = function(val, tar, t) {				
	if (Math.abs(val - tar) > 180)
	{
		if (val > tar) 
		{		
			tar += 360;				
		}
		else 
		{
			tar -= 360;				
		}
	}
	
	val += (tar - val) * t;
	
	return SEA3D.Math.angle(val);
}	

SEA3D.Math.lerpColor = function(val, tar, t) {
	var a0 = val >> 24 & 0xff,
		r0 = val >> 16 & 0xff,
		g0 = val >> 8 & 0xff,
		b0 = val & 0xff;
	
	var a1 = tar >> 24 & 0xff,
		r1 = tar >> 16 & 0xff,
		g1 = tar >> 8 & 0xff,
		b1 = tar & 0xff;
	
	a0 += (a1 - a0) * t;
	r0 += (r1 - r0) * t;
	g0 += (g1 - g0) * t;
	b0 += (b1 - b0) * t;
	
	return a0 << 24 | r0 << 16 | g0 << 8 | b0;
}

SEA3D.Math.lerp = function(val, tar, t) {
	return val + ((tar - val) * t);
}

SEA3D.Math.lerp1x = function(val, tar, t) {
	val[0] += (tar[0] - val[0]) * t;
}

SEA3D.Math.lerp3x = function(val, tar, t) {
	val[0] += (tar[0] - val[0]) * t;
	val[1] += (tar[1] - val[1]) * t;
	val[2] += (tar[2] - val[2]) * t;
}

SEA3D.Math.lerpAng1x = function(val, tar, t) {
	val[0] = SEA3D.Math.lerpAngle(val[0], tar[0], t);
}

SEA3D.Math.lerpColor1x = function(val, tar, t) {
	val[0] = SEA3D.Math.lerpColor(val[0], tar[0], t);
}	

SEA3D.Math.lerpQuat4x = function(val, tar, t) {				
	var x1 = val[0], 
		y1 = val[1], 
		z1 = val[2],
		w1 = val[3];
	
	var x2 = tar[0], 
		y2 = tar[1], 
		z2 = tar[2],
		w2 = tar[3];
	
	var x, y, z, w, l;
	
	// shortest direction
	if (x1 * x2 + y1 * y2 + z1 * z2 + w1 * w2 < 0) {				
		x2 = -x2;
		y2 = -y2;
		z2 = -z2;
		w2 = -w2;
	}
				
	x = x1 + t * (x2 - x1);
	y = y1 + t * (y2 - y1);
	z = z1 + t * (z2 - z1);
	w = w1 + t * (w2 - w1);
	
	l = 1.0 / Math.sqrt(w * w + x * x + y * y + z * z);			
	val[0] = x * l;
	val[1] = y * l;
	val[2] = z * l;
	val[3] = w * l;
}

//
//	BlendMethod
//

SEA3D.AnimationBlendMethod = {
	LINEAR : 'linear',
	EASING : 'easing'
}

//
//	AnimationFrame
//

SEA3D.AnimationFrame = function() {
	this.data = [0,0,0,0];	
}

SEA3D.AnimationFrame.prototype.toVector = function() {		
	return { x:this.data[0], y:this.data[1], z:this.data[2], w:this.data[3] };
}

SEA3D.AnimationFrame.prototype.toAngles = function(d) {
	var x = this.data[0], 
		y = this.data[1], 
		z = this.data[2], 
		w = this.data[3];
	
	var a = 2 * (w * y - z * x);
	
	if (a < -1) a = -1;
	else if (a > 1) a = 1; 
	
	return {
		x : Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * d,
		y : Math.asin(a) * d,
		z : Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * d
	}
}

SEA3D.AnimationFrame.prototype.toEuler = function() {
	return this.toAngles( SEA3D.Math.DEGREES );
}

SEA3D.AnimationFrame.prototype.toRadians = function() {
	return this.toAngles( 1 );
}

SEA3D.AnimationFrame.prototype.setX = function(val) {
	this.data[0] = val;
}

SEA3D.AnimationFrame.prototype.getX = function() {
	return this.data[0];
}

SEA3D.AnimationFrame.prototype.setY = function(val) {
	this.data[1] = val;
}

SEA3D.AnimationFrame.prototype.getY = function() {
	return this.data[1];
}

SEA3D.AnimationFrame.prototype.setZ = function(val) {
	this.data[2] = val;
}

SEA3D.AnimationFrame.prototype.getZ = function() {
	return this.data[2];
}

SEA3D.AnimationFrame.prototype.setW = function(val) {
	this.data[3] = val;
}

SEA3D.AnimationFrame.prototype.getW = function() {
	return this.data[3];
}

//
//	AnimationData
//

SEA3D.AnimationData = function(kind, dataType, data, offset) {
	this.kind = kind;
	this.type = dataType;
	this.blockLength = SEA3D.DataTable.sizeOf(dataType);
	this.data = data;
	this.offset = offset == undefined ? 0 : offset;
	
	switch(this.blockLength)
	{
		case 1: this.getData = this.getData1x; break;
		case 2: this.getData = this.getData2x; break;
		case 3: this.getData = this.getData3x; break;
		case 4: this.getData = this.getData4x; break;
	}
}

SEA3D.AnimationData.prototype.getData1x = function(frame, data) {
	frame = this.offset + frame * this.blockLength;	
			
	data[0] = this.data[frame];	
}

SEA3D.AnimationData.prototype.getData2x = function(frame, data) {
	frame = this.offset + frame * this.blockLength;	
			
	data[0] = this.data[frame];		
	data[1] = this.data[frame + 1];			
}

SEA3D.AnimationData.prototype.getData3x = function(frame, data) {
	frame = this.offset + frame * this.blockLength;	
			
	data[0] = this.data[frame];		
	data[1] = this.data[frame + 1];			
	data[2] = this.data[frame + 2];
}

SEA3D.AnimationData.prototype.getData4x = function(frame, data) {
	frame = this.offset + frame * this.blockLength;	
			
	data[0] = this.data[frame];		
	data[1] = this.data[frame + 1];			
	data[2] = this.data[frame + 2];
	data[3] = this.data[frame + 3];
}

//
//	AnimationNode
//

SEA3D.AnimationNode = function(name, frameRate, numFrames, repeat, intrpl) {
	this.name = name;
	this.frameRate = frameRate;
	this.frameMill = 1000 / frameRate;
	this.numFrames = numFrames;	
	this.length = numFrames - 1;
	this.time = 0;
	this.duration = this.length * this.frameMill;
	this.repeat = repeat;
	this.intrpl = intrpl;	
	this.invalidState = true;
	this.dataList = [];
	this.dataListId = {};
	this.buffer = new SEA3D.AnimationFrame();
	this.percent = 0;
	this.prevFrame = 0;
	this.nextFrame = 0;
	this.frame = 0;
}

SEA3D.AnimationNode.prototype.setTime = function(value) {
	this.frame = this.validFrame( value / this.frameMill );						
	this.time = this.frame * this.frameRate;			
	this.invalidState = true;
}

SEA3D.AnimationNode.prototype.getTime = function() {
	return this.time;
}

SEA3D.AnimationNode.prototype.setFrame = function(value) {
	this.setTime(value * this.frameMill);
}

SEA3D.AnimationNode.prototype.getRealFrame = function() {
	return Math.floor( this.frame );
}

SEA3D.AnimationNode.prototype.getFrame = function() {
	return this.frame;
}

SEA3D.AnimationNode.prototype.setPosition = function(value) {
	this.setFrame(value * (this.numFrames-1));
}

SEA3D.AnimationNode.prototype.getPosition = function() {
	return this.frame / (this.numFrames-1);
}

SEA3D.AnimationNode.prototype.validFrame = function(value) {
	var inverse = value < 0;
			
	if (inverse) value = -value;			
	
	if (value > this.length)
		value = this.repeat ? value % this.length : this.length;	
		
	if (inverse) value = this.length - value;
	
	return value;
}

SEA3D.AnimationNode.prototype.addData = function(animationData) {
	this.dataListId[animationData.kind] = animationData;
	this.dataList[this.dataList.length] = animationData;
}

SEA3D.AnimationNode.prototype.removeData = function(animationData) {			
	delete this.dataListId[animationData.kind];
	this.dataList.splice(this.dataList.indexOf(animationData), 1);			
}

SEA3D.AnimationNode.prototype.getDataByKind = function(kind) {			
	return this.dataListId[kind];
}

SEA3D.AnimationNode.prototype.getFrameAt = function(frame, id) {
	this.dataListId[id].getFrameData(frame, this.buffer.data);
	return this.buffer;
}

SEA3D.AnimationNode.prototype.getFrame = function(id) {
	this.dataListId[id].getFrameData(this.getRealFrame(), this.buffer.data);
	return this.buffer;
}

SEA3D.AnimationNode.prototype.getInterpolationFrame = function(animationData, iFunc) {		
	if (this.numFrames == 0) 
		return this.buffer;
	
	if (this.invalidState)
	{
		this.prevFrame = this.getRealFrame();								
		this.nextFrame = this.validFrame(this.prevFrame + 1);									
		this.percent = this.frame - this.prevFrame;				
		this.invalidState = false;
	}
	
	animationData.getData(this.prevFrame, this.buffer.data);
	
	if (this.percent > 0)
	{
		animationData.getData(this.nextFrame, SEA3D.AnimationNode.FRAME_BUFFER);	
		
		// interpolation function
		iFunc(this.buffer.data, SEA3D.AnimationNode.FRAME_BUFFER, this.percent);
	}
	
	return this.buffer;
}

SEA3D.AnimationNode.FRAME_BUFFER = [0,0,0,0];

//
//	AnimationSet
//

SEA3D.AnimationSet = function() {
	this.animations = [];	
	this.dataCount = -1;
}

SEA3D.AnimationSet.prototype.addAnimation = function(node) {
	if (this.dataCount == -1)
		this.dataCount = node.dataList.length;
	
	this.animations[node.name] = node;
	this.animations.push(node);	
}

SEA3D.AnimationSet.prototype.getAnimationByName = function(name) {
	return this.animations[name];
}

//
//	AnimationState
//

SEA3D.AnimationState = function(node) {
	this.node = node;
	this.offset = 0;
	this.weight = 0;
	this.time = 0;	
}

SEA3D.AnimationState.prototype.setTime = function(val) {
	this.node.time = this.time = val;	
}

SEA3D.AnimationState.prototype.getTime = function() {
	return this.time;
}

SEA3D.AnimationState.prototype.setFrame = function(val) {
	this.node.setFrame(val);
	this.time = this.node.time;
}

SEA3D.AnimationState.prototype.getFrame = function() {
	this.update();
	return this.node.getFrame();
}

SEA3D.AnimationState.prototype.setPosition = function(val) {
	this.node.setPosition(val);
	this.time = this.node.time;
}

SEA3D.AnimationState.prototype.getPosition = function() {
	this.update();
	return this.node.getPosition();
}

SEA3D.AnimationState.prototype.update = function() {
	if (this.node.time != this.time)		
		this.node.setTime( this.time );	
}

//
//	Animation Handler
//

SEA3D.AnimationHandler = function( animationSet ) {	
	this.animationSet = animationSet;
	this.states = SEA3D.AnimationHandler.stateFromAnimations( animationSet.animations );
	this.timeScale = 1;
	this.time = 0;
	this.numAnimation = animationSet.animations.length;
	this.relative = false;
	this.playing = false;
	this.delta = 0;
	this.easeSpeed = 2;
	this.crossfade = 0;
	this.updateAllStates = false;
	this.blendMethod = SEA3D.AnimationBlendMethod.LINEAR;
}

SEA3D.AnimationHandler.prototype.update = function(delta) {
	this.delta = delta;
	this.time += delta * this.timeScale;
	
	this.updateState();
	this.updateAnimation();
}

SEA3D.AnimationHandler.prototype.updateState = function() {
	var i, state;
	
	this.currentState.node.setTime( this.time - this.currentState.offset );
		
	if (this.currentState.weight < 1 && this.crossfade > 0)
	{
		var delta = Math.abs(this.delta) / (1000.0 * this.crossfade);				
		var weight = 1;
		
		if (this.blendMethod === SEA3D.AnimationBlendMethod.EASING)
			delta *= this.easeSpeed;
		
		for(i = 0; i < this.states.length; ++i) {
			state = this.states[i];
			
			if (state !== this.currentState) {
				if (this.blendMethod === SEA3D.AnimationBlendMethod.LINEAR)
					state.weight -= delta;
				else if (this.blendMethod === SEA3D.AnimationBlendMethod.EASING)
					state.weight -= state.weight * delta;
										
				if (state.weight < 0) 
					state.weight = 0;
				
				weight -= state.weight;
				
				if (this.updateAllStates) {
					state.node.setTime( this.time - state.offset );
				}
			}
		}
		
		if (weight < 0)				
			weight = 0;				
		
		this.currentState.weight = weight;
	} else {
		for(i = 0; i < this.states.length; ++i) {
			state = this.states[i];
			
			if (state === this.currentState)
				state.weight = 1;
			else {
				state.weight = 0;
				
				if (this.updateAllStates) {
					state.node.setTime( this.time );
				}
			}
		}
	}
}

SEA3D.AnimationHandler.prototype.updateAnimation = function() {
	var dataCount = this.animationSet.dataCount;		
	var nodes = this.animationSet.animations;
	var currentNode = this.currentState.node;
	
	for(var i = 0; i < dataCount; i++) {
		for(var n = 0; n < nodes.length; n++) {
			var node = nodes[n],
				state = this.states[n],
				data = node.dataList[i],				
				iFunc = SEA3D.Animation.DefaultLerpFuncs[data.kind],
				frame;
			
			if (n == 0) {
				frame = currentNode.getInterpolationFrame(currentNode.dataList[i], iFunc);
				
				if (!currentNode.repeat && currentNode.frame == currentNode.numFrames - 1) {
					if (this.onComplete)
						this.onComplete( this );
				}
			}
			
			if (node != currentNode) {
				if (state.weight > 0)
				{													
					iFunc(
						frame.data, 
						node.getInterpolationFrame(data, iFunc).data, 
						state.weight
					);	
				}
			}
						
			if (this.updateAnimationFrame)
				this.updateAnimationFrame(frame, data.kind);
		
		}
	}
}

SEA3D.AnimationHandler.prototype.getStateByName = function(name) {
	return this.states[name];
}

SEA3D.AnimationHandler.prototype.getStateNameByIndex = function(index) {
	return this.animationSet.animations[index].name;
}

SEA3D.AnimationHandler.prototype.play = function(name, crossfade, offset) {
	this.currentState = this.getStateByName(name);				
	
	if (!this.currentState)
		throw new Error('Animation "' + name + '" not found.');
	
	this.crossfade = crossfade;
	this.currentState.offset = this.time;
	
	if (offset !== undefined) 
		this.currentState.time = offset;
	
	if (!this.playing) {
		// add in animation collector			
		SEA3D.AnimationHandler.add( this );
		this.playing = true;
	}
}

SEA3D.AnimationHandler.prototype.resume = function() {
	if (!this.playing) {
		SEA3D.AnimationHandler.add( this );
		this.playing = true;
	}
}

SEA3D.AnimationHandler.prototype.pause = function() {
	if (this.playing) {
		SEA3D.AnimationHandler.remove( this );
		this.playing = false;
	}
}

SEA3D.AnimationHandler.prototype.stop = function() {
	this.time = 0;
	this.pause();
}

SEA3D.AnimationHandler.prototype.setRelative = function(val) {
	this.relative = val;
}

SEA3D.AnimationHandler.prototype.getRelative = function() {
	return this.relative;
}

//
//	Manager
//

SEA3D.AnimationHandler.add = function( animation ) {
	SEA3D.AnimationHandler.animations.push( animation );
}

SEA3D.AnimationHandler.remove = function( animation ) {
	SEA3D.AnimationHandler.animations.splice(SEA3D.AnimationHandler.animations.indexOf(animation), 1);
}

SEA3D.AnimationHandler.stateFromAnimations = function(anms) {
	var states = [];
	for (var i = 0; i < anms.length; i++) {
		states[anms[i].name] = states[i] = new SEA3D.AnimationState(anms[i]);			
	}	
	return states;
}

SEA3D.AnimationHandler.update = function( delta ) {	
	for(var i = 0, len = SEA3D.AnimationHandler.animations.length; i < len; i++) {		
		SEA3D.AnimationHandler.animations[i].update( delta * 1000 );
	}
}

SEA3D.AnimationHandler.setTime = function( time ) {
	for(var i = 0, len = SEA3D.AnimationHandler.animations.length; i < len; i++) {
		SEA3D.AnimationHandler.animations[i].time = time;
	}
}

SEA3D.AnimationHandler.stop = function() {
	while(SEA3D.AnimationHandler.animations.length) {
		SEA3D.AnimationHandler.animations[0].stop();
	}
}

SEA3D.AnimationHandler.animations = [];

//
//	Object
//

SEA3D.Object = function(name, data, type, sea) {
	this.name = name;
	this.data = data;
	this.type = type;
	this.sea = sea;
}

//
//	Geometry Base
//

SEA3D.GeometryBase = function(scope) {
	var data = scope.data;
	
	scope.attrib = data.readUShort();	
	
	scope.isBigMesh = (scope.attrib & 1) != 0;
	
	// variable uint
	data.readVInt = scope.isBigMesh ? data.readUInt : data.readUShort;
	
	scope.numVertex = data.readVInt();
	scope.length = scope.numVertex * 3;
}

//
//	Geometry
//

SEA3D.Geometry = function(name, data, sea) {
	var i, j, vec, len;

	this.name = name;
	this.data = data;	
	this.sea = sea;
	
	SEA3D.GeometryBase(this);
	
	// NORMAL
	if (this.attrib & 4) {
		this.normal = [];		
		
		i = 0;
		while (i < this.length)		
			this.normal[i++] = data.readFloat();	
	}
	
	// TANGENT
	if (this.attrib & 8) {
		this.tangent = [];
		
		i = 0;
		while (i < this.length)	
			this.tangent[i++] = data.readFloat();
	}
	
	// UV
	if (this.attrib & 32) {
		this.uv = [];
		this.uv.length = data.readUByte();
		
		len = this.numVertex * 2;
		
		i = 0;
		while (i < this.uv.length) {
			// UV VERTEX DATA
			this.uv[i++] = vec = [];									
			j = 0; 
			while(j < len) 
				vec[j++] = data.readFloat();		
		}
	}
	
	// JOINT-INDEXES / WEIGHTS
	if (this.attrib & 64) {
		this.jointPerVertex = data.readUByte();
		
		var jntLen = this.numVertex * this.jointPerVertex;
		
		this.joint = [];
		this.weight = [];
		
		i = 0;
		while (i < jntLen) {
			this.joint[i++] = data.readUShort();
		}
		
		i = 0;
		while (i < jntLen) {
			this.weight[i++] = data.readFloat(); 
		}
	}
	
	// VERTEX_COLOR
	if (this.attrib & 128) {
		var colorAttrib = data.readUByte(),
			numColor = (((colorAttrib & 64) >> 6) | ((colorAttrib & 128) >> 6)) + 1,
			colorCount = this.numVertex * 4;					
		
		this.color = [];
		this.color.length = colorAttrib & 15;
		
		for(i = 0; i < this.color.length; i++)
		{								
			var vColor = [];
			
			switch(numColor)
			{
				case 1:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = 0;
						vColor[j++] = 0;
						vColor[j++] = 1;
					}
					break;
				
				case 2:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = 0;
						vColor[j++] = 1;
					}
					break;
				
				case 3:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = 1;
					}
					break;
				
				case 4:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
					}
					break;
			}										
			
			this.color[i] = vColor;
		}
	}
	
	// VERTEX
	this.vertex = [];
	i = 0; 
	while(i < this.length) 
		this.vertex[i++] = data.readFloat();
	
	// SUB-MESHES
	this.indexes = [];
	this.indexes.length = data.readUByte();			
	
	// INDEXES
	for (i=0;i<this.indexes.length;i++) {
		len = data.readVInt() * 3;
		this.indexes[i] = vec = [];
		j = 0; 
		while(j < len) 
			vec[j++] = data.readVInt();
	}
}

SEA3D.Geometry.prototype.type = "geo";

//
//	Geometry Delta
//

SEA3D.GeometryDelta = function(name, data, sea) {
	var i, j, delta, readNumber, numDiv, vecUint, vec;

	this.name = name;
	this.data = data;	
	this.sea = sea;
	
	this.attrib = data.readUShort();	
	this.numVertex = data.readUInteger();
	
	this.length = this.numVertex * 3;
	
	if (this.attrib & 1)
	{		
		readNumber = function() { return data.readByte(); }
		numDiv = 0xFF / 2;
	}
	else
	{
		readNumber = function() { return data.readShort(); }
		numDiv = 0xFFFF / 2;
	}
	
	// NORMAL
	if (this.attrib & 4)
	{
		delta = data.readFloat();		
		this.normal = [];
		
		i = 0;
		while (i < this.length) 			
			this.normal[i++] = (readNumber() / numDiv) * delta;	
	}
	
	// TANGENT
	if (this.attrib & 8)
	{
		delta = data.readFloat();		
		this.tangent = [];
		
		i = 0;
		while (i < this.length) 			
			this.tangent[i++] = (readNumber() / numDiv) * delta;	
	}
	
	// UV
	if (this.attrib & 32) {
		this.uv = [];
		this.uv.length = data.readUByte();
		
		var uvLen = this.numVertex * 2;
		
		i = 0;
		while (i < this.uv.length) {
			// UV VERTEX DATA
			delta = data.readFloat();
			this.uv[i++] = vec = [];	
			
			j = 0; 
			while(j < uvLen) 
				vec[j++] = (readNumber() / numDiv) * delta;
		}
	}
	
	// JOINT-INDEXES / WEIGHTS
	if (this.attrib & 64) {
		this.jointPerVertex = data.readUByte();
		
		var jntLen = this.numVertex * this.jointPerVertex;
		
		this.joint = [];
		this.weight = [];
		
		i = 0;
		while (i < jntLen) {
			this.joint[i++] = data.readUInteger();
		}
		
		i = 0;
		while (i < jntLen) {
			this.weight[i++] = (readNumber() / numDiv) * 1;
		}
	}
	
	// VERTEX_COLOR
	if (this.attrib & 128) {
		var colorAttrib = data.readUByte(),
			numColor = (((colorAttrib & 64) >> 6) | ((colorAttrib & 128) >> 6)) + 1,
			colorCount = this.numVertex * 4;					
		
		this.color = [];
		this.color.length = colorAttrib & 15;
		
		for(i = 0; i < this.color.length; i++)
		{								
			var vColor = [];
			
			switch(numColor)
			{
				case 1:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = 0;
						vColor[j++] = 0;
						vColor[j++] = 1;
					}
					break;
				
				case 2:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = 0;
						vColor[j++] = 1;
					}
					break;
				
				case 3:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = 1;
					}
					break;
				
				case 4:
					j = 0;					
					while (j < colorCount)
					{
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
						vColor[j++] = data.readUByte() / 0xFF;
					}
					break;
			}										
			
			this.color[i] = vColor;
		}
	}
	
	// VERTEX
	delta = data.readFloat();	
	
	this.vertex = [];	
	i = 0; 
	while(i < this.length) 
		this.vertex[i++] = (readNumber() / numDiv) * delta;
	
	// SUB-MESHES
	this.indexes = [];
	this.indexes.length = data.readUByte();			
	
	// INDEXES
	if (this.attrib & 2) {
		// POLYGON		
		for (i=0;i<this.indexes.length;i++) {
			var polyCount = data.readUInteger();
			
			this.indexes[i] = vecUint = [];
								
			for(j = 0; j < polyCount; j++) 
			{
				var a = data.readUInteger(),
					b = data.readUInteger(),
					c = data.readUInteger(),
					d = data.readUInteger();
				
				
				vecUint.push(a);
				vecUint.push(b);
				vecUint.push(c);
				
				if (d > 0)
				{
					vecUint.push(c);
					vecUint.push(d + 1);
					vecUint.push(a);																		
				}
				else continue;							
			}
		}	
	} else {
		var polyCount = data.readUInteger() * 3;
		
		// TRIANGLE		
		for (i=0;i<this.indexes.length;i++) {
			this.indexes[i] = vecUint = [];	
			
			j = 0; 
			while(j < polyCount) 
				vecUint[j++] = data.readUInteger();			
		}
	}
}

SEA3D.GeometryDelta.prototype.type = "geDL";

//
//	Object3D
//

SEA3D.Object3D = 
{
	read : function(scope) {
		var data = scope.data;
		
		scope.isStatic = false;
		
		scope.attrib = data.readUShort();	
		scope.tags = [];
		
		if (scope.attrib & 1)
			scope.parent = scope.sea.getObject(data.readUInt());
		
		if (scope.attrib & 2)
			scope.animations = SEA3D.Animation.readAnimationList(data, scope.sea);		
		
		if (scope.attrib & 4)
			scope.scripts = SEA3D.Script.readScriptList(data, scope.sea);		
			
		if (scope.attrib & 16)
			scope.properties = scope.sea.getObject(data.readUInt());	
		
		if (scope.attrib & 32) {
			var objectType = data.readUByte();
			scope.isStatic = objectType & 1;
		}
	}
	,readTags : function(scope, callback) {
		var data = scope.data,	
			numTag = data.readUByte();		
		
		for (var i=0;i<numTag;++i) {
			var kind = data.readUShort();
			var size = data.readUInt();				
			var pos = data.position;
			
			//not implemented
			//readTag(kind, size)
			
			data.position = pos += size; 
		}
	}
}

//
//	Entity3D
//

SEA3D.Entity3D = 
{
	read : function(scope) {
		SEA3D.Object3D.read(scope);
	
		var data = scope.data;				
		
		scope.castShadows = true;
		
		if (scope.attrib & 64) {
			var lightType = data.readUByte();			
			scope.castShadows = (lightType & 1) == 0;
		}
	}
	,readTags : function(scope, callback) {
		SEA3D.Object3D.readTags(scope, callback);
	}
}

//
//	Sound3D
//

SEA3D.Sound3D = 
{
	read : function(scope) {
		SEA3D.Object3D.read(scope);
	
		var data = scope.data,
			sea = scope.sea;
		
		scope.autoPlay = (scope.attrib & 64) != 0;
		
		if (scope.attrib & 128) 
			scope.mixer = sea.getObject(data.readUInt());
		
		scope.sound = sea.getObject(data.readUInt());
		scope.volume = data.readFloat();
	}
	,readTags : function(scope, callback) {
		SEA3D.Object3D.readTags(scope, callback);
	}
}

//
//	Sound Point
//

SEA3D.SoundPoint = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Sound3D.read(this);
	
	this.position = data.readVector3();	
	this.distance = data.readFloat();	
	
	SEA3D.Sound3D.readTags(this);
}

SEA3D.SoundPoint.prototype.type = "sp";

//
//	Container3D
//

SEA3D.Container3D = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Object3D.read(this);
	
	this.transform = data.readMatrix();
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.Container3D.prototype.type = "c3d";

//
//	Texture URL
//

SEA3D.TextureURL = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.url = data.readUTF( data.length );
}

SEA3D.TextureURL.prototype.type = "urlT";

//
//	Actions
//

SEA3D.Actions = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.count = data.readUInt();
	this.action = [];
	
	for(var i = 0; i < this.count; i++) {
		var flag = data.readUByte();
		var kind = data.readUShort();
						
		var size = data.readUShort();
		
		var position = data.position;		
		var act = this.action[i] = {kind:kind};
		
		// range of animation
		if (flag & 1)
		{
			// start and count in frames
			act.range = [data.readUInt(), data.readUInt()];
		}
		
		// time
		if (flag & 2)
		{
			act.time = data.readUInt();
		}
		
		// easing
		if (flag & 4)
		{
			act.intrpl = SEA3D.DataTable.INTERPOLATION_TABLE[data.readUByte()];
													
			if (act.intrpl.indexOf('back.') == 0)
			{
				act.intrplParam0 = data.readFloat();					
			}
			else if (act.intrpl.indexOf('elastic.') == 0)					
			{
				act.intrplParam0 = data.readFloat();
				act.intrplParam1 = data.readFloat();
			}
		}
		
		switch (kind) {
			case SEA3D.Actions.RTT_TARGET:
				act.source = sea.getObject(data.readUInt());
				act.target = sea.getObject(data.readUInt());
				break;
			
			case SEA3D.Actions.LOOK_AT:
				act.source = sea.getObject(data.readUInt());
				act.target = sea.getObject(data.readUInt());
				break;
			
			case SEA3D.Actions.PLAY_SOUND:					
				act.sound = sea.getObject(data.readUInt());
				act.offset = data.readUInt();
				break;
			
			case SEA3D.Actions.PLAY_ANIMATION:
				act.object = sea.getObject(data.readUInt());
				act.name = data.readUTF8();
				break;
			
			case SEA3D.Actions.FOG:						
				act.color = data.readUInt24();
				act.min = data.readFloat();
				act.max = data.readFloat();						
				break;
			
			case SEA3D.Actions.ENVIRONMENT:										
				act.texture = sea.getObject(data.readUInt());
				break;
			
			case SEA3D.Actions.ENVIRONMENT_COLOR:
				act.color = data.readUInt24();
				break;	
			
			case SEA3D.Actions.CAMERA:
				act.camera = sea.getObject(data.readUInt());
				break;	
			
			default:
				console.log("Action \"" + kind + "\" not found.");
				break;
		}
		
		data.position = position + size;
	}			
}

SEA3D.Actions.SCENE = 0;
SEA3D.Actions.ENVIRONMENT_COLOR = 1;
SEA3D.Actions.ENVIRONMENT = 2;		
SEA3D.Actions.FOG = 3;
SEA3D.Actions.PLAY_ANIMATION = 4;
SEA3D.Actions.PLAY_SOUND = 5;
SEA3D.Actions.ANIMATION_AUDIO_SYNC = 6;
SEA3D.Actions.LOOK_AT = 7;		
SEA3D.Actions.RTT_TARGET = 8;		
SEA3D.Actions.CAMERA = 9;

SEA3D.Actions.prototype.type = "act";

//
//	Script
//

SEA3D.Script = 
{
	DETAILED : false
	
	,readScriptList : function(data, sea) {
		var list = [],					
			count = data.readUByte();
	
		var i = 0;
		while ( i < count )
		{				
			var attrib = data.readUByte(),				
				script = {};
			
			script.priority = (attrib & 1) | (attrib & 2);
			
			if (attrib & 4)
			{
				var j, name;
				
				count = data.readUByte();
				
				if (SEA3D.Script.DETAILED)
				{
					script.params = [];
					
					for(j = 0; j < count; j++)
					{
						name = data.readUTF8();
						var type = data.readUByte();
						
						script.params[j] = 
							{ 
								name : name, 
								type : type, 
								data : SEA3D.DataTable.readToken(type, data)
							};
					}
				}
				else
				{
					script.params = {};
					
					for ( j = 0; j < count; j++ )
					{
						name = data.readUTF8();		
						script.params[name] = SEA3D.DataTable.readObject(data);
					}
				}					
			}
			
			if (attrib & 8)
			{
				script.method = data.readUTF8();
			}
			
			script.tag = sea.getObject(data.readUInt());
			
			list[i++] = script;
		}
		
		return list;
	}
}

//
//	Java Script
//

SEA3D.JavaScript = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
}

SEA3D.JavaScript.prototype.type = "js";

//
//	Dummy
//

SEA3D.Dummy = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Object3D.read(this);
	
	this.transform = data.readMatrix();
	
	this.width = data.readFloat();
	this.height = data.readFloat();
	this.depth = data.readFloat();
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.Dummy.prototype.type = "dmy";

//
//	Line
//

SEA3D.Line = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Object3D.read(this);
	
	this.count = (this.attrib & 64 ? data.readUInt() : data.readUShort()) * 3;		
	this.closed = (this.attrib & 128) != 0;			
	this.transform = data.readMatrix();				
	
	this.vertex = [];
	
	var i = 0;
	while ( i < this.count )
		this.vertex[i++] = data.readFloat();
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.Line.prototype.type = "line";

//
//	Planar Render
//

SEA3D.PlanarRender = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.attrib = data.readUByte();
	
	this.quality = (this.attrib & 1) | (this.attrib & 2);
	this.transform = data.readMatrix();
}

SEA3D.PlanarRender.prototype.type = "rttp";

//
//	Cube Render
//

SEA3D.CubeRender = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.attrib = data.readUByte();
	
	this.quality = (this.attrib & 1) | (this.attrib & 2);
	this.position = data.readVector3();
}

SEA3D.CubeRender.prototype.type = "rttc";

//
//	Mesh2D
//

SEA3D.Mesh2D = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Object3D.read(this);
	
	if (this.attrib & 256)			
		this.material = sea.getObject(data.readUInt());	
	
	this.position = data.readVector3();
	
	this.width = data.readFloat();
	this.height = data.readFloat();
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.Mesh2D.prototype.type = "m2d";

//
//	Mesh
//

SEA3D.Mesh = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
		
	SEA3D.Entity3D.read(this);
	
	// MATERIAL
	if (this.attrib & 256) {				
		this.material = [];		
		
		var len = data.readUByte();
		
		if (len == 1) this.material[0] = sea.getObject(data.readUInt());
		else
		{
			var i = 0;
			while ( i < len )	
			{
				var matIndex = data.readUInt();
				if (matIndex > 0) this.material[i++] = sea.getObject(matIndex-1);
				else this.material[i++] = undefined;	
			}
		}
	}
	
	if (this.attrib & 512) {
		this.modifiers = [];	
		
		var len = data.readUByte();
		
		for ( var i = 0; i < len; i++ )
			this.modifiers[i] = sea.getObject(data.readUInt());
	}
	
	this.transform = data.readMatrix();
	
	this.geometry = sea.getObject(data.readUInt());
	
	SEA3D.Entity3D.readTags(this);
}

SEA3D.Mesh.prototype.type = "m3d";

//
//	Skeleton
//

SEA3D.Skeleton = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;	
		
	var length = data.readUShort();
	
	this.joint = [];		
	
	for(var i=0;i<length;i++) {
		this.joint[i] = {	
				name:data.readUTF8(),
				parentIndex:data.readUShort() - 1,
				inverseBindMatrix:data.readMatrix()							
			}
	}
}

SEA3D.Skeleton.prototype.type = "skl";

//
//	Skeleton Local
//

SEA3D.SkeletonLocal = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;	
		
	var length = data.readUShort();
	
	this.joint = [];		
	
	for(var i=0;i<length;i++) {
		this.joint[i] = {
				name:data.readUTF8(),
				parentIndex:data.readUShort() - 1,
				
				// POSITION XYZ
				x:data.readFloat(),
				y:data.readFloat(),
				z:data.readFloat(),
				// QUATERNION XYZW
				qx:data.readFloat(),
				qy:data.readFloat(),
				qz:data.readFloat(),
				qw:data.readFloat(),
				// SCALE
				sx:data.readFloat(),
				sy:data.readFloat(),
				sz:data.readFloat()						
			}
	}
}

SEA3D.SkeletonLocal.prototype.type = "sklq";

//
//	Animation Base
//

SEA3D.AnimationBase = 
{
	read : function(scope) {
		var data = scope.data, flag = data.readUByte();			
		
		scope.sequence = [];
		
		if (flag & 1) {
			var count = data.readUShort();
			
			for(var i=0;i<count;i++) {
				flag = data.readUByte();
		
				scope.sequence[i] = {
					name:data.readUTF8(), 
					start:data.readUInt(), 
					count:data.readUInt(),
					repeat:(flag & 1) != 0, 
					intrpl:(flag & 2) != 0
				}
			}
		}		
		
		scope.frameRate = data.readUByte();
		scope.numFrames = data.readUInt();
		
		// no contains sequence
		if (scope.sequence.length == 0)
			scope.sequence[0] = {name:"root",start:0,count:scope.numFrames,repeat:true,intrpl:true};
	}
}

//
//	Animation
//

SEA3D.Animation = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;

	SEA3D.AnimationBase.read(this);
	
	this.dataList = [];
	this.dataList.length = data.readUByte();
					
	for(var i=0;i<this.dataList.length;i++) {
	
		var kind = data.readUShort(),
			type = data.readUByte(),
			anmRaw = [];
		
		SEA3D.DataTable.readVector(type, data, anmRaw, this.numFrames, 0);
		
		this.dataList[i] = {
				kind:kind,
				type:type,	
				blockSize:SEA3D.DataTable.sizeOf(type),		
				data:anmRaw
			}
	}		
}

SEA3D.Animation.POSITION = 0;
SEA3D.Animation.ROTATION = 1;
SEA3D.Animation.SCALE = 2;
SEA3D.Animation.COLOR = 3;
SEA3D.Animation.MULTIPLIER = 4;
SEA3D.Animation.ATTENUATION_START = 5;
SEA3D.Animation.ATTENUATION_END = 6;
SEA3D.Animation.FOV = 7;
SEA3D.Animation.OFFSET_U = 8;
SEA3D.Animation.OFFSET_V = 9;
SEA3D.Animation.SCALE_U = 10;
SEA3D.Animation.SCALE_V = 11;
SEA3D.Animation.ANGLE = 12;
SEA3D.Animation.ALPHA = 13;
SEA3D.Animation.VOLUME = 14;

SEA3D.Animation.DefaultLerpFuncs = [
	SEA3D.Math.lerp3x, // POSITION
	SEA3D.Math.lerpQuat4x, // ROTATION
	SEA3D.Math.lerp3x, // SCALE
	SEA3D.Math.lerpColor1x, // COLOR
	SEA3D.Math.lerp1x, // MULTIPLIER
	SEA3D.Math.lerp1x, // ATTENUATION_START
	SEA3D.Math.lerp1x, // ATTENUATION_END
	SEA3D.Math.lerp1x, // FOV
	SEA3D.Math.lerp1x, // OFFSET_U
	SEA3D.Math.lerp1x, // OFFSET_V
	SEA3D.Math.lerp1x, // SCALE_U
	SEA3D.Math.lerp1x, // SCALE_V
	SEA3D.Math.lerpAng1x, // ANGLE
	SEA3D.Math.lerp1x, // ALPHA
	SEA3D.Math.lerp1x // VOLUME
]

SEA3D.Animation.readAnimationList = function(data, sea) {
	var list = [],					
		count = data.readUByte();				

	var i = 0;
	while ( i < count ) {				
		var attrib = data.readUByte(),				
			anm = {};
		
		anm.relative = (attrib & 1) != 0;
		
		if (attrib & 2)
			anm.timeScale = data.readFloat();
		
		anm.tag = sea.getObject(data.readUInt());
		
		list[i++] = anm;
	}
	
	return list;
}

SEA3D.Animation.prototype.type = "anm";

//
//	Skeleton Animation
//

SEA3D.SkeletonAnimation = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
		
	var i, j, count, joint;
	
	SEA3D.AnimationBase.read(this);
	
	count = data.readUShort()
	
	this.pose = [];		
	
	for(i=0;i<this.numFrames;i++) {
		joint = [];
		joint.length = count;
		
		for(j=0;j<count;j++) {
			joint[j] = {
				// POSITION XYZ
				x:data.readFloat(),
				y:data.readFloat(),
				z:data.readFloat(),
				// QUATERNION XYZW
				qx:data.readFloat(),
				qy:data.readFloat(),
				qz:data.readFloat(),
				qw:data.readFloat()
			}
		}
		
		this.pose[i] = joint;
	}
}

SEA3D.SkeletonAnimation.prototype.type = "skla";

//
//	Morph
//

SEA3D.Morph = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.GeometryBase(this);
	
	var useVertex = (this.attrib & 2) != 0;
	var useNormal = (this.attrib & 4) != 0;
	
	var len = this.numVertex * 3;
	
	var nodeCount = data.readUShort();
	
	this.node = [];

	var i, j;
			
	for(i = 0; i < nodeCount; i++) {
		var nodeName = data.readUTF8();
		
		if (useVertex) {				
			var verts = [];
			
			j = 0;
			while(j < len)
				verts[j++] = data.readFloat();
		}
		
		if (useNormal) {
			var norms = [];
			
			j = 0;
			while(j < len)
				norms[j++] = data.readFloat();
		}
		
		this.node[i] = {vertex:verts, normal:norms, name:nodeName}
	}	
}

SEA3D.Morph.prototype.type = "mph";

//
//	Camera
//

SEA3D.Camera = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
		
	SEA3D.Object3D.read(this);
		
	if (this.attrib & 64) {
		this.dof = {
				distance:data.readFloat(),
				range:data.readFloat()
			}
	}
	
	this.transform = data.readMatrix();
	
	this.fov = data.readFloat();	
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.Camera.prototype.type = "cam";

//
//	Joint Object
//

SEA3D.JointObject = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
		
	SEA3D.Object3D.read(this);
	
	this.target = sea.getObject(data.readUInt());
	this.joint = data.readUShort();
	
	this.transform = data.readMatrix();
	
	this.fov = data.readFloat();	
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.JointObject.prototype.type = "jnt";

//
//	Light
//

SEA3D.Light = {
	read : function(scope) {
		SEA3D.Object3D.read(scope);
		
		var data = scope.data;
		
		scope.attenStart = Number.MAX_VALUE;
		scope.attenEnd = Number.MAX_VALUE;
		
		if (scope.attrib & 64) {
			var shadowHeader = data.readUByte();
			
			scope.shadow = {}
			
			scope.shadow.opacity = shadowHeader & 1 ? data.readFloat() : 1;
			scope.shadow.color = shadowHeader & 2 ? data.readUInt24() : 0x000000;
		}
		
		if (scope.attrib & 512) {
			scope.attenStart = data.readFloat();
			scope.attenEnd = data.readFloat();
		}
					
		scope.color = data.readUInt24();
		scope.multiplier = data.readFloat();		
	}
}

//
//	Point Light
//

SEA3D.PointLight = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Light.read(this);
	
	if (this.attrib & 128) {
		this.attenuation = {
				start:data.readFloat(),
				end:data.readFloat()
			}
	}
	
	this.position = data.readVector3();
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.PointLight.prototype.type = "plht";

//
//	Directional Light
//

SEA3D.DirectionalLight = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	SEA3D.Light.read(this);
	
	this.transform = data.readMatrix();
	
	SEA3D.Object3D.readTags(this);
}

SEA3D.DirectionalLight.prototype.type = "dlht";

//
//	Material
//

SEA3D.Material = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.technique = [];
	
	this.attrib = data.readUShort();
	
	this.alpha = 1;
	this.blendMode = "normal";
	this.alphaThreshold = .5;
	
	this.bothSides = (this.attrib & 1) != 0;
		
	this.receiveLights = (this.attrib & 2) == 0;
	this.receiveShadows = (this.attrib & 4) == 0;
	this.receiveFog = (this.attrib & 8) == 0;
	
	this.smooth = (this.attrib & 16) == 0;
	
	if (this.attrib & 32)
		this.alpha = data.readFloat();
		
	if (this.attrib & 64)
		this.blendMode = data.readBlendMode();
	
	if (this.attrib & 128)
		this.animations = SEA3D.Animation.readAnimationList(data, sea);
	
	this.depthMask = (this.attrib & 256) == 0;
	
	var count = data.readUByte();
	
	for (var i = 0; i < count; ++i) {
		var kind = data.readUShort();
		var size = data.readUShort();				
		var pos = data.position;
		var tech, methodAttrib;
		
		switch(kind) {
			case SEA3D.Material.DEFAULT:				
				tech = {
						ambientColor:data.readUInt24(),
						diffuseColor:data.readUInt24(),
						specularColor:data.readUInt24(),
						
						specular:data.readFloat(),
						gloss:data.readFloat()
					}				
				break;			
			case SEA3D.Material.COMPOSITE_TEXTURE:				
				tech = {
						composite:sea.getObject(data.readUInt())
					}	
				break;				
			case SEA3D.Material.DIFFUSE_MAP:				
				tech = {
						texture:sea.getObject(data.readUInt())
					}
				break;			
			case SEA3D.Material.SPECULAR_MAP:				
				tech = {
						texture:sea.getObject(data.readUInt())
					}				
				break;			
			case SEA3D.Material.NORMAL_MAP:				
				tech = {
						texture:sea.getObject(data.readUInt())
					}				
				break;				
			case SEA3D.Material.REFLECTION:
			case SEA3D.Material.FRESNEL_REFLECTION:
				tech = {						
						texture:sea.getObject(data.readUInt()),
						alpha:data.readFloat()						
					}
											
				if (kind == SEA3D.Material.FRESNEL_REFLECTION) {
					tech.power = data.readFloat();
					tech.normal = data.readFloat();
				}	
				break;			
			case SEA3D.Material.REFRACTION:
				tech = {
						texture:sea.getObject(data.readUInt()),
						alpha:data.readFloat(),
						ior:data.readFloat()						
					}
				break;			
			case SEA3D.Material.RIM:
				tech = {
						color:data.readUInt24(),
						strength:data.readFloat(),								
						power:data.readFloat(),			
						blendMode:data.readBlendMode()
					}
				break;			
			case SEA3D.Material.LIGHT_MAP:
				tech = {
						texture:sea.getObject(data.readUInt()),
						channel:data.readUByte(),
						blendMode:data.readBlendMode()
					}
				break;			
			case SEA3D.Material.DETAIL_MAP:
				tech = {
						texture:sea.getObject(data.readUInt()),
						scale:data.readFloat(),
						blendMode:data.readBlendMode()
					}
				break;
			case SEA3D.Material.CEL:
				tech = {
						color:data.readUInt24(),
						levels:data.readUByte(),
						size:data.readFloat(),
						specularCutOff:data.readFloat(),
						smoothness:data.readFloat()						
					}
				break;
			case SEA3D.Material.TRANSLUCENT:
				tech = {
						color:data.readUInt24(),
						translucency:data.readFloat(),
						scattering:data.readFloat()			
					}
				break;
			case SEA3D.Material.BLEND_NORMAL_MAP:
				methodAttrib = data.readUByte();  
				
				tech = {						
						texture:sea.getObject(data.readUInt()),
						secondaryTexture:sea.getObject(data.readUInt())								
					}
				
				if (methodAttrib & 1)
				{
					tech.offsetX0 = data.readFloat();
					tech.offsetY0 = data.readFloat();
					
					tech.offsetX1 = data.readFloat();
					tech.offsetY1 = data.readFloat();
				}
				else
				{
					tech.offsetX0 = tech.offsetY0 = 							
					tech.offsetX1 = tech.offsetY1 = 0
				}
				
				tech.animate = methodAttrib & 2;	
				break;
			case SEA3D.Material.MIRROR_REFLECTION:
				tech = {
						texture:sea.getObject(data.readUInt()),
						alpha:data.readFloat()				
					}
				break;
				
			case SEA3D.Material.AMBIENT_MAP:
				tech = {
						texture:sea.getObject(data.readUInt())			
					}
				break;
				
			case SEA3D.Material.ALPHA_MAP:
				tech = {
						texture:sea.getObject(data.readUInt())			
					}
				break;
				
			case SEA3D.Material.EMISSIVE_MAP:
				tech = {
						texture:sea.getObject(data.readUInt())			
					}
				break;
			
			case SEA3D.Material.VERTEX_COLOR:
				tech = {
						blendMode:data.readBlendMode()		
					}
				break;
			
			case SEA3D.Material.WRAP_LIGHTING:
				tech = {
						color:data.readUInt24(),
						strength:data.readFloat()
					}
				break;
			
			case SEA3D.Material.COLOR_REPLACE:
				tech = {
						color:data.readUInt24(),
						strength:data.readFloat()
					}
				break;
			
			case SEA3D.Material.COLOR_REPLACE:
				methodAttrib = data.readUByte();  
						
				tech = {
						red:data.readUInt24(),
						green:data.readUInt24(),
						blue:data.readUInt24()
					}
						
				if (methodAttrib & 1)										
					tech.mask = sea.getObject(data.readUInt());
					
				if (methodAttrib & 2)
					tech.alpha = data.readFloat();
				break;
			
			case SEA3D.Material.REFLECTION_SPHERICAL:
				tech = {
						texture:sea.getObject(data.readUInt()),
						alpha:data.readFloat()				
					}					
				break;
			
			default:						
				console.warn("SEA3D: MaterialTechnique not found:", kind.toString(16));
				data.position = pos += size;
				continue;
		}
		
		tech.kind = kind;
				
		this.technique.push(tech);								
		
		data.position = pos += size;
	}
}

SEA3D.Material.DEFAULT = 0;
SEA3D.Material.COMPOSITE_TEXTURE = 1;
SEA3D.Material.DIFFUSE_MAP = 2;
SEA3D.Material.SPECULAR_MAP = 3;
SEA3D.Material.REFLECTION = 4;
SEA3D.Material.REFRACTION = 5;
SEA3D.Material.NORMAL_MAP = 6;
SEA3D.Material.FRESNEL_REFLECTION = 7;
SEA3D.Material.RIM = 8;
SEA3D.Material.LIGHT_MAP = 9;
SEA3D.Material.DETAIL_MAP = 10;
SEA3D.Material.CEL = 11;
SEA3D.Material.TRANSLUCENT = 12;
SEA3D.Material.BLEND_NORMAL_MAP = 13;
SEA3D.Material.MIRROR_REFLECTION = 14;
SEA3D.Material.AMBIENT_MAP = 15;
SEA3D.Material.ALPHA_MAP = 16;
SEA3D.Material.EMISSIVE_MAP = 17;
SEA3D.Material.VERTEX_COLOR = 18;
SEA3D.Material.WRAP_LIGHTING = 19;
SEA3D.Material.COLOR_REPLACE = 20;
SEA3D.Material.REFLECTION_SPHERICAL = 21;

SEA3D.Material.prototype.type = "mat";

//
//	Composite
//

SEA3D.Composite = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	var layerCount = data.readUByte();
	
	this.layer = [];
	
	for(var i = 0; i < layerCount; i++)
		this.layer[i] = this.readLayer(data, this);	
}

SEA3D.Composite.prototype.getLayerByName = function(name) {
	for(var i = 0; i < this.layer.length; i++) {
		if (this.layer[i].name == name)
			return this.layer[i];
	}	
}

SEA3D.Composite.prototype.readLayer = function(data, scope) {
	this.scope = scope;
	
	var out = {
		blendMode:"normal",
		opacity:1
	}
	
	var attrib = data.readUShort();		
	
	if (attrib & 1) out.texture = this.readLayerBitmap(data, scope);
	else out.color = data.readUInt24();
			
	if (attrib & 2)
		out.mask = this.readLayerBitmap(data, scope);			
	
	if (attrib & 4)
		out.name = data.readUTF8();
	
	if (attrib & 8)
		out.blendMode = data.readBlendMode();
	
	if (attrib & 16)
		out.opacity = data.readFloat();
		
	return out;
}

SEA3D.Composite.prototype.readLayerBitmap = function(data, scope) {
	this.scope = scope;
	
	var out = {
		channel:0,
		repeat:true,
		offsetU:0,
		offsetV:0,
		scaleU:0,
		scaleV:0,
		rotation:0
	}
	
	out.map = scope.sea.getObject(data.readUInt());
	
	var attrib = data.readUShort();
	
	if (attrib > 0) {
		if (attrib & 1)							
			out.channel = data.readUByte();
		
		if (attrib & 2)							
			out.repeat = false;
		
		if (attrib & 4)							
			out.offsetU = data.readFloat();
		
		if (attrib & 8)							
			out.offsetV = data.readFloat();
		
		if (attrib & 16)							
			out.scaleU = data.readFloat();
		
		if (attrib & 32)							
			out.scaleV = data.readFloat();
		
		if (attrib & 64)							
			out.rotation = data.readFloat();
		
		if (attrib & 128)							
			out.animation = SEA3D.Animation.readAnimationList(data, scope.sea);		
	}
	
	return out;
}

SEA3D.Composite.prototype.type = "ctex";

//
//	Cube Maps
//

SEA3D.CubeMap = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.transparent = false;
	
	var ext = data.readExt();
	
	this.faces = [];
	
	for(var i = 0; i < 6; i++) {		
		var size = data.readUInt();
		this.faces[i] = data.concat(data.position, size);			
		data.position += size;
	}	
}

SEA3D.CubeMap.prototype.type = "cmap";

//
//	JPEG
//

SEA3D.JPEG = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.transparent = false;
}

SEA3D.JPEG.prototype.type = "jpg";

//
//	JPEG_XR
//

SEA3D.JPEG_XR = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.transparent = true;
}

SEA3D.JPEG_XR.prototype.type = "wdp";

//
//	PNG
//

SEA3D.PNG = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.transparent = data.buffer[25] == 0x06;		
}

SEA3D.PNG.prototype.type = "png";

//
//	GIF
//

SEA3D.GIF = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;
	
	this.transparent = data.buffer[11] > 0;	
}

SEA3D.GIF.prototype.type = "gif";

//
//	MP3
//

SEA3D.MP3 = function(name, data, sea) {
	this.name = name;
	this.data = data;
	this.sea = sea;		
}

SEA3D.MP3.prototype.type = "mp3";

//
//	FILE FORMAT
//

SEA3D.File = function(data) {
	this.stream = new SEA3D.Stream(data);	
	this.version = SEA3D.VERSION;
	this.objects = [];
	this.typeClass = {}
	this.typeRead = {}	
	this.position =
	this.dataPosition = 0;
	this.scope = this;		
	this.timeLimit = 60;
	
	// SEA3D
	this.addClass(SEA3D.Geometry);	
	this.addClass(SEA3D.GeometryDelta);	
	this.addClass(SEA3D.Mesh);
	this.addClass(SEA3D.Mesh2D);
	this.addClass(SEA3D.Material);
	this.addClass(SEA3D.Composite);
	this.addClass(SEA3D.PointLight);	
	this.addClass(SEA3D.DirectionalLight);	
	this.addClass(SEA3D.Skeleton);
	this.addClass(SEA3D.SkeletonLocal);
	this.addClass(SEA3D.SkeletonAnimation);
	this.addClass(SEA3D.JointObject);
	this.addClass(SEA3D.Camera);
	this.addClass(SEA3D.Morph);
	this.addClass(SEA3D.CubeMap);
	this.addClass(SEA3D.Animation);	
	this.addClass(SEA3D.Dummy);
	this.addClass(SEA3D.Line);
	this.addClass(SEA3D.SoundPoint);
	this.addClass(SEA3D.PlanarRender);
	this.addClass(SEA3D.CubeRender);
	this.addClass(SEA3D.Actions);
	this.addClass(SEA3D.JavaScript);
	this.addClass(SEA3D.TextureURL);
	this.addClass(SEA3D.Container3D);
	
	// UNIVERSAL
	this.addClass(SEA3D.JPEG);
	this.addClass(SEA3D.JPEG_XR);
	this.addClass(SEA3D.PNG);
	this.addClass(SEA3D.GIF);
	this.addClass(SEA3D.MP3);
}

SEA3D.File.CompressionLibs = {};
SEA3D.File.DecompressionMethod = {}

SEA3D.File.setDecompressionEngine = function(id, name, method) {
	SEA3D.File.CompressionLibs[id] = name;
	SEA3D.File.DecompressionMethod[id] = method;
}

SEA3D.File.prototype.addClass = function(clazz) {
	this.typeClass[clazz.prototype.type] = clazz;
}

SEA3D.File.prototype.readHead = function() {	
	if (this.stream.bytesAvailable() < 16)
		return false;
		
	if (this.stream.readUTF(3) != "SEA")
		console.error("Invalid SEA3D format.");
		
	var sign = this.stream.readUTF(3);
		
	if (sign != "S3D")
		console.warn("Signature \"" + sign + "\" not recognized.");
		
	this.version = this.stream.readUInt24();
	
	if (this.stream.readUByte() != 0) {				
		throw new Error("Protection algorithm not is compatible.");
	}
	
	this.compressionID = this.stream.readUByte();
	
	this.compressionAlgorithm = SEA3D.File.CompressionLibs[this.compressionID];
	this.decompressionMethod = SEA3D.File.DecompressionMethod[this.compressionID];	
	
	if (this.compressionID > 0 && !this.decompressionMethod) {
		throw new Error("Compression algorithm not is compatible.");
	}
		
	this.length = this.stream.readUInt();	
	
	this.dataPosition = this.stream.position;
	
	this.objects.length = 0;
	
	this.stage = this.readBody;
	
	return true;
}

SEA3D.File.prototype.getObject = function(index) {
	return this.objects[index];
}

SEA3D.File.prototype.readSEAObject = function() {
	if (this.stream.bytesAvailable() < 4)
		return null;
	
	var size = this.stream.readUInt();
	var position = this.stream.position;
	
	if (this.stream.bytesAvailable() < size)
		return null;
	
	var flag = this.stream.readUByte();
	var type = this.stream.readExt();
	
	var name = flag & 1 ? this.stream.readUTF8() : "",
		compressed = (flag & 2) != 0,
		streaming = (flag & 4) != 0;
	
	size -= this.stream.position - position;
	position = this.stream.position;
	
	var data = this.stream.concat(position, size),
		obj;		
	
	if (streaming && this.typeClass[type])
	{
		if (compressed && this.decompressionMethod)
			data.set(this.decompressionMethod(data.buffer));
	
		obj = new this.typeClass[type](name, data, this);
		
		if (this.typeRead[type])
			this.typeRead[type].call(this.scope, obj);
	}
	else
	{
		obj = new SEA3D.Object(name, data, type, this);		
		
		console.warn("SEA3D: Unknown format \"" + type + "\" of file \"" + name + "\". Add a module referring for this format.");
	}		
	
	this.objects.push(this.objects[obj.type + "/" + obj.name] = obj);
	
	this.dataPosition = position + size;
	
	++this.position;
	
	return obj;
}

SEA3D.File.prototype.readBody = function() {	
	this.timer.update();	
	
	while (this.position < this.length) {
		if (this.timer.getDeltaTime() < this.timeLimit) {	
			this.stream.position = this.dataPosition;
			
			var sea = this.readSEAObject();			
			
			if (sea) this.dispatchCompleteObject(sea);				
			else return false;
		}
		else return false;
	}
	
	this.stage = this.readComplete;
	
	return true;
}

SEA3D.File.prototype.readComplete = function() {
	this.stream.position = this.dataPosition;
	
	if (this.stream.readUInt24() != 0x5EA3D1)
		console.warn("SEA3D file is corrupted.");
	
	this.stage = null;
	
	this.dispatchComplete();
}

SEA3D.File.prototype.readStage = function(scope) {
	var t;
	while (scope.stage && scope.stage()) t=0;
	if (scope.stage) {
		window.setInterval(scope.readStage, 10, scope);
		scope.dispatchProgress();
	}
}

SEA3D.File.prototype.read = function() {	
	this.timer = new SEA3D.Timer();
	this.stage = this.readHead;
	
	this.readStage(this);
}

SEA3D.File.prototype.dispatchCompleteObject = function(obj) {
	if (!this.onCompleteObject) return;
	
	this.onCompleteObject({
			file:this,
			object:obj
		});
}

SEA3D.File.prototype.dispatchProgress = function() {
	if (!this.onProgress) return;
	
	this.onProgress({
			file:this,
			loaded:this.position,			
			total:this.length,
			progress:this.position / this.length
		});	
}

SEA3D.File.prototype.dispatchDownloadProgress = function(position, length) {
	if (!this.onDownloadProgress) return;
	
	this.onDownloadProgress({
			file:this,
			loaded:position,
			total:length,
			progress:position / length
		});	
}

SEA3D.File.prototype.dispatchComplete = function() {
	var elapsedTime = this.timer.getElapsedTime();
	var message = elapsedTime + "ms, " + this.objects.length + " objects";		

	if (this.onComplete) this.onComplete({
			file:this,
			timeTotal:elapsedTime,
			message:message
		});
	else console.log("SEA3D:", message);
}

SEA3D.File.prototype.dispatchError = function(id, message) {
	if (this.onError) this.onError({file:this,id:id,message:message});
	else console.error("SEA3D: #" + id, message);
}

SEA3D.File.prototype.load = function( url ) {	
	var scope = this,
		xhr = new XMLHttpRequest();
	
	xhr.open( "GET", url, true );
	xhr.responseType = 'arraybuffer';
	
	xhr.onprogress = function(e) {
		if (e.lengthComputable) 
			scope.dispatchDownloadProgress( e.loaded, e.total );
	}
	
	xhr.onreadystatechange = function() {
		if ( xhr.readyState === 2 ){		
			//xhr.getResponseHeader("Content-Length");
		} else if ( xhr.readyState === 3 ) {
			//	progress
		} else if ( xhr.readyState === 4 ) {
			if ( xhr.status === 200 || xhr.status === 0 ) {
				// complete
				scope.stream.set(new Uint8Array(this.response));				
				scope.read();				
			} else {
				this.dispatchError(1001, "Couldn't load [" + url + "] [" + xhr.status + "]");				
			}
		}		
	}	
	
	xhr.send();	
}

/*
Copyright (c) 2011 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
References:
- "LZMA SDK" by Igor Pavlov
  http://www.7-zip.org/sdk.html
*/

var LZMA = LZMA || {};

LZMA.OutWindow = function(){
  this._windowSize = 0;
};

LZMA.OutWindow.prototype.create = function(windowSize){
  if ( (!this._buffer) || (this._windowSize !== windowSize) ){
    this._buffer = [];
  }
  this._windowSize = windowSize;
  this._pos = 0;
  this._streamPos = 0;
};

LZMA.OutWindow.prototype.flush = function(){
  var size = this._pos - this._streamPos;
  if (size !== 0){
    while(size --){
      this._stream.writeByte(this._buffer[this._streamPos ++]);
    }
    if (this._pos >= this._windowSize){
      this._pos = 0;
    }
    this._streamPos = this._pos;
  }
};

LZMA.OutWindow.prototype.releaseStream = function(){
  this.flush();
  this._stream = null;
};

LZMA.OutWindow.prototype.setStream = function(stream){
  this.releaseStream();
  this._stream = stream;
};

LZMA.OutWindow.prototype.init = function(solid){
  if (!solid){
    this._streamPos = 0;
    this._pos = 0;
  }
};

LZMA.OutWindow.prototype.copyBlock = function(distance, len){
  var pos = this._pos - distance - 1;
  if (pos < 0){
    pos += this._windowSize;
  }
  while(len --){
    if (pos >= this._windowSize){
      pos = 0;
    }
    this._buffer[this._pos ++] = this._buffer[pos ++];
    if (this._pos >= this._windowSize){
      this.flush();
    }
  }
};

LZMA.OutWindow.prototype.putByte = function(b){
  this._buffer[this._pos ++] = b;
  if (this._pos >= this._windowSize){
    this.flush();
  }
};

LZMA.OutWindow.prototype.getByte = function(distance){
  var pos = this._pos - distance - 1;
  if (pos < 0){
    pos += this._windowSize;
  }
  return this._buffer[pos];
};

LZMA.RangeDecoder = function(){
};

LZMA.RangeDecoder.prototype.setStream = function(stream){
  this._stream = stream;
};

LZMA.RangeDecoder.prototype.releaseStream = function(){
  this._stream = null;
};

LZMA.RangeDecoder.prototype.init = function(){
  var i = 5;

  this._code = 0;
  this._range = -1;
  
  while(i --){
    this._code = (this._code << 8) | this._stream.readByte();
  }
};

LZMA.RangeDecoder.prototype.decodeDirectBits = function(numTotalBits){
  var result = 0, i = numTotalBits, t;

  while(i --){
    this._range >>>= 1;
    t = (this._code - this._range) >>> 31;
    this._code -= this._range & (t - 1);
    result = (result << 1) | (1 - t);

    if ( (this._range & 0xff000000) === 0){
      this._code = (this._code << 8) | this._stream.readByte();
      this._range <<= 8;
    }
  }

  return result;
};

LZMA.RangeDecoder.prototype.decodeBit = function(probs, index){
  var prob = probs[index],
      newBound = (this._range >>> 11) * prob;

  if ( (this._code ^ 0x80000000) < (newBound ^ 0x80000000) ){
    this._range = newBound;
    probs[index] += (2048 - prob) >>> 5;
    if ( (this._range & 0xff000000) === 0){
      this._code = (this._code << 8) | this._stream.readByte();
      this._range <<= 8;
    }
    return 0;
  }

  this._range -= newBound;
  this._code -= newBound;
  probs[index] -= prob >>> 5;
  if ( (this._range & 0xff000000) === 0){
    this._code = (this._code << 8) | this._stream.readByte();
    this._range <<= 8;
  }
  return 1;
};

LZMA.initBitModels = function(probs, len){
  while(len --){
    probs[len] = 1024;
  }
};

LZMA.BitTreeDecoder = function(numBitLevels){
  this._models = [];
  this._numBitLevels = numBitLevels;
};

LZMA.BitTreeDecoder.prototype.init = function(){
  LZMA.initBitModels(this._models, 1 << this._numBitLevels);
};

LZMA.BitTreeDecoder.prototype.decode = function(rangeDecoder){
  var m = 1, i = this._numBitLevels;

  while(i --){
    m = (m << 1) | rangeDecoder.decodeBit(this._models, m);
  }
  return m - (1 << this._numBitLevels);
};

LZMA.BitTreeDecoder.prototype.reverseDecode = function(rangeDecoder){
  var m = 1, symbol = 0, i = 0, bit;

  for (; i < this._numBitLevels; ++ i){
    bit = rangeDecoder.decodeBit(this._models, m);
    m = (m << 1) | bit;
    symbol |= bit << i;
  }
  return symbol;
};

LZMA.reverseDecode2 = function(models, startIndex, rangeDecoder, numBitLevels){
  var m = 1, symbol = 0, i = 0, bit;

  for (; i < numBitLevels; ++ i){
    bit = rangeDecoder.decodeBit(models, startIndex + m);
    m = (m << 1) | bit;
    symbol |= bit << i;
  }
  return symbol;
};

LZMA.LenDecoder = function(){
  this._choice = [];
  this._lowCoder = [];
  this._midCoder = [];
  this._highCoder = new LZMA.BitTreeDecoder(8);
  this._numPosStates = 0;
};

LZMA.LenDecoder.prototype.create = function(numPosStates){
  for (; this._numPosStates < numPosStates; ++ this._numPosStates){
    this._lowCoder[this._numPosStates] = new LZMA.BitTreeDecoder(3);
    this._midCoder[this._numPosStates] = new LZMA.BitTreeDecoder(3);
  }
};

LZMA.LenDecoder.prototype.init = function(){
  var i = this._numPosStates;
  LZMA.initBitModels(this._choice, 2);
  while(i --){
    this._lowCoder[i].init();
    this._midCoder[i].init();
  }
  this._highCoder.init();
};

LZMA.LenDecoder.prototype.decode = function(rangeDecoder, posState){
  if (rangeDecoder.decodeBit(this._choice, 0) === 0){
    return this._lowCoder[posState].decode(rangeDecoder);
  }
  if (rangeDecoder.decodeBit(this._choice, 1) === 0){
    return 8 + this._midCoder[posState].decode(rangeDecoder);
  }
  return 16 + this._highCoder.decode(rangeDecoder);
};

LZMA.Decoder2 = function(){
  this._decoders = [];
};

LZMA.Decoder2.prototype.init = function(){
  LZMA.initBitModels(this._decoders, 0x300);
};

LZMA.Decoder2.prototype.decodeNormal = function(rangeDecoder){
  var symbol = 1;

  do{
    symbol = (symbol << 1) | rangeDecoder.decodeBit(this._decoders, symbol);
  }while(symbol < 0x100);

  return symbol & 0xff;
};

LZMA.Decoder2.prototype.decodeWithMatchByte = function(rangeDecoder, matchByte){
  var symbol = 1, matchBit, bit;

  do{
    matchBit = (matchByte >> 7) & 1;
    matchByte <<= 1;
    bit = rangeDecoder.decodeBit(this._decoders, ( (1 + matchBit) << 8) + symbol);
    symbol = (symbol << 1) | bit;
    if (matchBit !== bit){
      while(symbol < 0x100){
        symbol = (symbol << 1) | rangeDecoder.decodeBit(this._decoders, symbol);
      }
      break;
    }
  }while(symbol < 0x100);

  return symbol & 0xff;
};

LZMA.LiteralDecoder = function(){
};

LZMA.LiteralDecoder.prototype.create = function(numPosBits, numPrevBits){
  var i;

  if (this._coders
    && (this._numPrevBits === numPrevBits)
    && (this._numPosBits === numPosBits) ){
    return;
  }
  this._numPosBits = numPosBits;
  this._posMask = (1 << numPosBits) - 1;
  this._numPrevBits = numPrevBits;

  this._coders = [];

  i = 1 << (this._numPrevBits + this._numPosBits);
  while(i --){
    this._coders[i] = new LZMA.Decoder2();
  }
};

LZMA.LiteralDecoder.prototype.init = function(){
  var i = 1 << (this._numPrevBits + this._numPosBits);
  while(i --){
    this._coders[i].init();
  }
};

LZMA.LiteralDecoder.prototype.getDecoder = function(pos, prevByte){
  return this._coders[( (pos & this._posMask) << this._numPrevBits)
    + ( (prevByte & 0xff) >>> (8 - this._numPrevBits) )];
};

LZMA.Decoder = function(){
  this._outWindow = new LZMA.OutWindow();
  this._rangeDecoder = new LZMA.RangeDecoder();
  this._isMatchDecoders = [];
  this._isRepDecoders = [];
  this._isRepG0Decoders = [];
  this._isRepG1Decoders = [];
  this._isRepG2Decoders = [];
  this._isRep0LongDecoders = [];
  this._posSlotDecoder = [];
  this._posDecoders = [];
  this._posAlignDecoder = new LZMA.BitTreeDecoder(4);
  this._lenDecoder = new LZMA.LenDecoder();
  this._repLenDecoder = new LZMA.LenDecoder();
  this._literalDecoder = new LZMA.LiteralDecoder();
  this._dictionarySize = -1;
  this._dictionarySizeCheck = -1;

  this._posSlotDecoder[0] = new LZMA.BitTreeDecoder(6);
  this._posSlotDecoder[1] = new LZMA.BitTreeDecoder(6);
  this._posSlotDecoder[2] = new LZMA.BitTreeDecoder(6);
  this._posSlotDecoder[3] = new LZMA.BitTreeDecoder(6);
};

LZMA.Decoder.prototype.setDictionarySize = function(dictionarySize){
  if (dictionarySize < 0){
    return false;
  }
  if (this._dictionarySize !== dictionarySize){
    this._dictionarySize = dictionarySize;
    this._dictionarySizeCheck = Math.max(this._dictionarySize, 1);
    this._outWindow.create( Math.max(this._dictionarySizeCheck, 4096) );
  }
  return true;
};

LZMA.Decoder.prototype.setLcLpPb = function(lc, lp, pb){
  var numPosStates = 1 << pb;

  if (lc > 8 || lp > 4 || pb > 4){
    return false;
  }

  this._literalDecoder.create(lp, lc);

  this._lenDecoder.create(numPosStates);
  this._repLenDecoder.create(numPosStates);
  this._posStateMask = numPosStates - 1;

  return true;
};

LZMA.Decoder.prototype.init = function(){
  var i = 4;

  this._outWindow.init(false);

  LZMA.initBitModels(this._isMatchDecoders, 192);
  LZMA.initBitModels(this._isRep0LongDecoders, 192);
  LZMA.initBitModels(this._isRepDecoders, 12);
  LZMA.initBitModels(this._isRepG0Decoders, 12);
  LZMA.initBitModels(this._isRepG1Decoders, 12);
  LZMA.initBitModels(this._isRepG2Decoders, 12);
  LZMA.initBitModels(this._posDecoders, 114);

  this._literalDecoder.init();

  while(i --){
    this._posSlotDecoder[i].init();
  }

  this._lenDecoder.init();
  this._repLenDecoder.init();
  this._posAlignDecoder.init();
  this._rangeDecoder.init();
};

LZMA.Decoder.prototype.decode = function(inStream, outStream, outSize){
  var state = 0, rep0 = 0, rep1 = 0, rep2 = 0, rep3 = 0, nowPos64 = 0, prevByte = 0,
      posState, decoder2, len, distance, posSlot, numDirectBits;

  this._rangeDecoder.setStream(inStream);
  this._outWindow.setStream(outStream);

  this.init();

  while(outSize < 0 || nowPos64 < outSize){
    posState = nowPos64 & this._posStateMask;

    if (this._rangeDecoder.decodeBit(this._isMatchDecoders, (state << 4) + posState) === 0){
      decoder2 = this._literalDecoder.getDecoder(nowPos64 ++, prevByte);

      if (state >= 7){
        prevByte = decoder2.decodeWithMatchByte(this._rangeDecoder, this._outWindow.getByte(rep0) );
      }else{
        prevByte = decoder2.decodeNormal(this._rangeDecoder);
      }
      this._outWindow.putByte(prevByte);

      state = state < 4? 0: state - (state < 10? 3: 6);

    }else{

      if (this._rangeDecoder.decodeBit(this._isRepDecoders, state) === 1){
        len = 0;
        if (this._rangeDecoder.decodeBit(this._isRepG0Decoders, state) === 0){
          if (this._rangeDecoder.decodeBit(this._isRep0LongDecoders, (state << 4) + posState) === 0){
            state = state < 7? 9: 11;
            len = 1;
          }
        }else{
          if (this._rangeDecoder.decodeBit(this._isRepG1Decoders, state) === 0){
            distance = rep1;
          }else{
            if (this._rangeDecoder.decodeBit(this._isRepG2Decoders, state) === 0){
              distance = rep2;
            }else{
              distance = rep3;
              rep3 = rep2;
            }
            rep2 = rep1;
          }
          rep1 = rep0;
          rep0 = distance;
        }
        if (len === 0){
          len = 2 + this._repLenDecoder.decode(this._rangeDecoder, posState);
          state = state < 7? 8: 11;
        }
      }else{
        rep3 = rep2;
        rep2 = rep1;
        rep1 = rep0;

        len = 2 + this._lenDecoder.decode(this._rangeDecoder, posState);
        state = state < 7? 7: 10;

        posSlot = this._posSlotDecoder[len <= 5? len - 2: 3].decode(this._rangeDecoder);
        if (posSlot >= 4){

          numDirectBits = (posSlot >> 1) - 1;
          rep0 = (2 | (posSlot & 1) ) << numDirectBits;

          if (posSlot < 14){
            rep0 += LZMA.reverseDecode2(this._posDecoders,
                rep0 - posSlot - 1, this._rangeDecoder, numDirectBits);
          }else{
            rep0 += this._rangeDecoder.decodeDirectBits(numDirectBits - 4) << 4;
            rep0 += this._posAlignDecoder.reverseDecode(this._rangeDecoder);
            if (rep0 < 0){
              if (rep0 === -1){
                break;
              }
              return false;
            }
          }
        }else{
          rep0 = posSlot;
        }
      }

      if (rep0 >= nowPos64 || rep0 >= this._dictionarySizeCheck){
        return false;
      }

      this._outWindow.copyBlock(rep0, len);
      nowPos64 += len;
      prevByte = this._outWindow.getByte(0);
    }
  }

  this._outWindow.flush();
  this._outWindow.releaseStream();
  this._rangeDecoder.releaseStream();

  return true;
};

LZMA.Decoder.prototype.setDecoderProperties = function(properties){
  var value, lc, lp, pb, dictionarySize;

  if (properties.size < 5){
    return false;
  }

  value = properties.readByte();
  lc = value % 9;
  value = ~~(value / 9);
  lp = value % 5;
  pb = ~~(value / 5);

  if ( !this.setLcLpPb(lc, lp, pb) ){
    return false;
  }

  dictionarySize = properties.readByte();
  dictionarySize |= properties.readByte() << 8;
  dictionarySize |= properties.readByte() << 16;
  dictionarySize += properties.readByte() * 16777216;

  return this.setDictionarySize(dictionarySize);
};

LZMA.decompress = function(properties, inStream, outStream, outSize){
  var decoder = new LZMA.Decoder();

  if ( !decoder.setDecoderProperties(properties) ){
    throw "Incorrect stream properties";
  }

  if ( !decoder.decode(inStream, outStream, outSize) ){
    throw "Error in data stream";
  }

  return true;
};

LZMA.decompressFile = function(inStream, outStream){
  var decoder = new LZMA.Decoder(), outSize;

  if ( !decoder.setDecoderProperties(inStream) ){
    throw "Incorrect stream properties";
  }

  outSize = inStream.readByte();
  outSize |= inStream.readByte() << 8;
  outSize |= inStream.readByte() << 16;
  outSize += inStream.readByte() * 16777216;

  inStream.readByte();
  inStream.readByte();
  inStream.readByte();
  inStream.readByte();

  if ( !decoder.decode(inStream, outStream, outSize) ){
    throw "Error in data stream";
  }

  return true;
};

/**
 * 	SEA3D.js - SEA3D SDK ( LZMA )
 * 	Copyright (C) 2013 Sunag Entertainment 
 * 
 * 	http://code.google.com/p/sea3d/
 */
 
SEA3D.File.LZMAUncompress = function(data) {	
	var inStream = {
		data:data,
		position:0,
		readByte:function(){
			return this.data[this.position++];
		}
	}
	
	var outStream = {
		data:[],
		position:0,
		writeByte: function(value){
			this.data[this.position++] = value;
		}
	}
	
	LZMA.decompressFile(inStream, outStream);

	return new Uint8Array(outStream.data);
}

SEA3D.File.setDecompressionEngine(2, "lzma", SEA3D.File.LZMAUncompress);

/*
 * $Id: rawinflate.js,v 0.3 2013/04/09 14:25:38 dankogai Exp dankogai $
 *
 * GNU General Public License, version 2 (GPL-2.0)
 *   http://opensource.org/licenses/GPL-2.0
 * original:
 *   http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt
 */

(function(ctx){

/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.0.1
 * LastModified: Dec 25 1999
 */

/* Interface:
 * data = zip_inflate(src);
 */

/* constant parameters */
var zip_WSIZE = 32768;		// Sliding Window size
var zip_STORED_BLOCK = 0;
var zip_STATIC_TREES = 1;
var zip_DYN_TREES    = 2;

/* for inflate */
var zip_lbits = 9; 		// bits in base literal/length lookup table
var zip_dbits = 6; 		// bits in base distance lookup table
var zip_INBUFSIZ = 32768;	// Input buffer size
var zip_INBUF_EXTRA = 64;	// Extra buffer

/* variables (inflate) */
var zip_slide;
var zip_wp;			// current position in slide
var zip_fixed_tl = null;	// inflate static
var zip_fixed_td;		// inflate static
var zip_fixed_bl, fixed_bd;	// inflate static
var zip_bit_buf;		// bit buffer
var zip_bit_len;		// bits in bit buffer
var zip_method;
var zip_eof;
var zip_copy_leng;
var zip_copy_dist;
var zip_tl, zip_td;	// literal/length and distance decoder tables
var zip_bl, zip_bd;	// number of bits decoded by tl and td

var zip_inflate_data;
var zip_inflate_pos;


/* constant tables (inflate) */
var zip_MASK_BITS = new Array(
    0x0000,
    0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
    0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff);
// Tables for deflate from PKZIP's appnote.txt.
var zip_cplens = new Array( // Copy lengths for literal codes 257..285
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0);
/* note: see note #13 above about the 258 in this list. */
var zip_cplext = new Array( // Extra bits for literal codes 257..285
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99); // 99==invalid
var zip_cpdist = new Array( // Copy offsets for distance codes 0..29
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
    8193, 12289, 16385, 24577);
var zip_cpdext = new Array( // Extra bits for distance codes
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
    12, 12, 13, 13);
var zip_border = new Array(  // Order of the bit length code lengths
    16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15);
/* objects (inflate) */

var zip_HuftList = function() {
    this.next = null;
    this.list = null;
}

var zip_HuftNode = function() {
    this.e = 0; // number of extra bits or operation
    this.b = 0; // number of bits in this code or subcode

    // union
    this.n = 0; // literal, length base, or distance base
    this.t = null; // (zip_HuftNode) pointer to next level of table
}

var zip_HuftBuild = function(b,	// code lengths in bits (all assumed <= BMAX)
		       n,	// number of codes (assumed <= N_MAX)
		       s,	// number of simple-valued codes (0..s-1)
		       d,	// list of base values for non-simple codes
		       e,	// list of extra bits for non-simple codes
		       mm	// maximum lookup bits
		   ) {
    this.BMAX = 16;   // maximum bit length of any code
    this.N_MAX = 288; // maximum number of codes in any set
    this.status = 0;	// 0: success, 1: incomplete table, 2: bad input
    this.root = null;	// (zip_HuftList) starting table
    this.m = 0;		// maximum lookup bits, returns actual

/* Given a list of code lengths and a maximum table size, make a set of
   tables to decode that set of codes.	Return zero on success, one if
   the given code set is incomplete (the tables are still built in this
   case), two if the input is invalid (all zero length codes or an
   oversubscribed set of lengths), and three if not enough memory.
   The code with value 256 is special, and the tables are constructed
   so that no bits beyond that code are fetched when that code is
   decoded. */
    {
	var a;			// counter for codes of length k
	var c = new Array(this.BMAX+1);	// bit length count table
	var el;			// length of EOB code (value 256)
	var f;			// i repeats in table every f entries
	var g;			// maximum code length
	var h;			// table level
	var i;			// counter, current code
	var j;			// counter
	var k;			// number of bits in current code
	var lx = new Array(this.BMAX+1);	// stack of bits per table
	var p;			// pointer into c[], b[], or v[]
	var pidx;		// index of p
	var q;			// (zip_HuftNode) points to current table
	var r = new zip_HuftNode(); // table entry for structure assignment
	var u = new Array(this.BMAX); // zip_HuftNode[BMAX][]  table stack
	var v = new Array(this.N_MAX); // values in order of bit length
	var w;
	var x = new Array(this.BMAX+1);// bit offsets, then code stack
	var xp;			// pointer into x or c
	var y;			// number of dummy codes added
	var z;			// number of entries in current table
	var o;
	var tail;		// (zip_HuftList)

	tail = this.root = null;
	for(i = 0; i < c.length; i++)
	    c[i] = 0;
	for(i = 0; i < lx.length; i++)
	    lx[i] = 0;
	for(i = 0; i < u.length; i++)
	    u[i] = null;
	for(i = 0; i < v.length; i++)
	    v[i] = 0;
	for(i = 0; i < x.length; i++)
	    x[i] = 0;

	// Generate counts for each bit length
	el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
	p = b; pidx = 0;
	i = n;
	do {
	    c[p[pidx]]++;	// assume all entries <= BMAX
	    pidx++;
	} while(--i > 0);
	if(c[0] == n) {	// null input--all zero length codes
	    this.root = null;
	    this.m = 0;
	    this.status = 0;
	    return;
	}

	// Find minimum and maximum length, bound *m by those
	for(j = 1; j <= this.BMAX; j++)
	    if(c[j] != 0)
		break;
	k = j;			// minimum code length
	if(mm < j)
	    mm = j;
	for(i = this.BMAX; i != 0; i--)
	    if(c[i] != 0)
		break;
	g = i;			// maximum code length
	if(mm > i)
	    mm = i;

	// Adjust last length count to fill out codes, if needed
	for(y = 1 << j; j < i; j++, y <<= 1)
	    if((y -= c[j]) < 0) {
		this.status = 2;	// bad input: more codes than bits
		this.m = mm;
		return;
	    }
	if((y -= c[i]) < 0) {
	    this.status = 2;
	    this.m = mm;
	    return;
	}
	c[i] += y;

	// Generate starting offsets into the value table for each length
	x[1] = j = 0;
	p = c;
	pidx = 1;
	xp = 2;
	while(--i > 0)		// note that i == g from above
	    x[xp++] = (j += p[pidx++]);

	// Make a table of values in order of bit lengths
	p = b; pidx = 0;
	i = 0;
	do {
	    if((j = p[pidx++]) != 0)
		v[x[j]++] = i;
	} while(++i < n);
	n = x[g];			// set n to length of v

	// Generate the Huffman codes and for each, make the table entries
	x[0] = i = 0;		// first Huffman code is zero
	p = v; pidx = 0;		// grab values in bit order
	h = -1;			// no tables yet--level -1
	w = lx[0] = 0;		// no bits decoded yet
	q = null;			// ditto
	z = 0;			// ditto

	// go through the bit lengths (k already is bits in shortest code)
	for(; k <= g; k++) {
	    a = c[k];
	    while(a-- > 0) {
		// here i is the Huffman code of length k bits for value p[pidx]
		// make tables up to required level
		while(k > w + lx[1 + h]) {
		    w += lx[1 + h]; // add bits already decoded
		    h++;

		    // compute minimum size table less than or equal to *m bits
		    z = (z = g - w) > mm ? mm : z; // upper limit
		    if((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
			// too few codes for k-w bit table
			f -= a + 1;	// deduct codes from patterns left
			xp = k;
			while(++j < z) { // try smaller tables up to z bits
			    if((f <<= 1) <= c[++xp])
				break;	// enough codes to use up j bits
			    f -= c[xp];	// else deduct codes from patterns
			}
		    }
		    if(w + j > el && w < el)
			j = el - w;	// make EOB code end at table
		    z = 1 << j;	// table entries for j-bit table
		    lx[1 + h] = j; // set table size in stack

		    // allocate and link in new table
		    q = new Array(z);
		    for(o = 0; o < z; o++) {
			q[o] = new zip_HuftNode();
		    }

		    if(tail == null)
			tail = this.root = new zip_HuftList();
		    else
			tail = tail.next = new zip_HuftList();
		    tail.next = null;
		    tail.list = q;
		    u[h] = q;	// table starts after link

		    /* connect to last table, if there is one */
		    if(h > 0) {
			x[h] = i;		// save pattern for backing up
			r.b = lx[h];	// bits to dump before this table
			r.e = 16 + j;	// bits in this table
			r.t = q;		// pointer to this table
			j = (i & ((1 << w) - 1)) >> (w - lx[h]);
			u[h-1][j].e = r.e;
			u[h-1][j].b = r.b;
			u[h-1][j].n = r.n;
			u[h-1][j].t = r.t;
		    }
		}

		// set up table entry in r
		r.b = k - w;
		if(pidx >= n)
		    r.e = 99;		// out of values--invalid code
		else if(p[pidx] < s) {
		    r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
		    r.n = p[pidx++];	// simple code is just the value
		} else {
		    r.e = e[p[pidx] - s];	// non-simple--look up in lists
		    r.n = d[p[pidx++] - s];
		}

		// fill code-like entries with r //
		f = 1 << (k - w);
		for(j = i >> w; j < z; j += f) {
		    q[j].e = r.e;
		    q[j].b = r.b;
		    q[j].n = r.n;
		    q[j].t = r.t;
		}

		// backwards increment the k-bit code i
		for(j = 1 << (k - 1); (i & j) != 0; j >>= 1)
		    i ^= j;
		i ^= j;

		// backup over finished tables
		while((i & ((1 << w) - 1)) != x[h]) {
		    w -= lx[h];		// don't need to update q
		    h--;
		}
	    }
	}

	/* return actual size of base table */
	this.m = lx[1];

	/* Return true (1) if we were given an incomplete table */
	this.status = ((y != 0 && g != 1) ? 1 : 0);
    } /* end of constructor */
}


/* routines (inflate) */

var zip_GET_BYTE = function() {
    if(zip_inflate_data.length == zip_inflate_pos)
	return -1;
	return zip_inflate_data[zip_inflate_pos++];
    //return zip_inflate_data.charCodeAt(zip_inflate_pos++) & 0xff;
}

var zip_NEEDBITS = function(n) {
    while(zip_bit_len < n) {
	zip_bit_buf |= zip_GET_BYTE() << zip_bit_len;
	zip_bit_len += 8;
    }
}

var zip_GETBITS = function(n) {
    return zip_bit_buf & zip_MASK_BITS[n];
}

var zip_DUMPBITS = function(n) {
    zip_bit_buf >>= n;
    zip_bit_len -= n;
}

var zip_inflate_codes = function(buff, off, size) {
    /* inflate (decompress) the codes in a deflated (compressed) block.
       Return an error code or zero if it all goes ok. */
    var e;		// table entry flag/number of extra bits
    var t;		// (zip_HuftNode) pointer to table entry
    var n;

    if(size == 0)
      return 0;

    // inflate the coded data
    n = 0;
    for(;;) {			// do until end of block
	zip_NEEDBITS(zip_bl);
	t = zip_tl.list[zip_GETBITS(zip_bl)];
	e = t.e;
	while(e > 16) {
	    if(e == 99)
		return -1;
	    zip_DUMPBITS(t.b);
	    e -= 16;
	    zip_NEEDBITS(e);
	    t = t.t[zip_GETBITS(e)];
	    e = t.e;
	}
	zip_DUMPBITS(t.b);

	if(e == 16) {		// then it's a literal
	    zip_wp &= zip_WSIZE - 1;
	    buff[off + n++] = zip_slide[zip_wp++] = t.n;
	    if(n == size)
		return size;
	    continue;
	}

	// exit if end of block
	if(e == 15)
	    break;

	// it's an EOB or a length

	// get length of block to copy
	zip_NEEDBITS(e);
	zip_copy_leng = t.n + zip_GETBITS(e);
	zip_DUMPBITS(e);

	// decode distance of block to copy
	zip_NEEDBITS(zip_bd);
	t = zip_td.list[zip_GETBITS(zip_bd)];
	e = t.e;

	while(e > 16) {
	    if(e == 99)
		return -1;
	    zip_DUMPBITS(t.b);
	    e -= 16;
	    zip_NEEDBITS(e);
	    t = t.t[zip_GETBITS(e)];
	    e = t.e;
	}
	zip_DUMPBITS(t.b);
	zip_NEEDBITS(e);
	zip_copy_dist = zip_wp - t.n - zip_GETBITS(e);
	zip_DUMPBITS(e);

	// do the copy
	while(zip_copy_leng > 0 && n < size) {
	    zip_copy_leng--;
	    zip_copy_dist &= zip_WSIZE - 1;
	    zip_wp &= zip_WSIZE - 1;
	    buff[off + n++] = zip_slide[zip_wp++]
		= zip_slide[zip_copy_dist++];
	}

	if(n == size)
	    return size;
    }

    zip_method = -1; // done
    return n;
}

var zip_inflate_stored = function(buff, off, size) {
    /* "decompress" an inflated type 0 (stored) block. */
    var n;

    // go to byte boundary
    n = zip_bit_len & 7;
    zip_DUMPBITS(n);

    // get the length and its complement
    zip_NEEDBITS(16);
    n = zip_GETBITS(16);
    zip_DUMPBITS(16);
    zip_NEEDBITS(16);
    if(n != ((~zip_bit_buf) & 0xffff))
	return -1;			// error in compressed data
    zip_DUMPBITS(16);

    // read and output the compressed data
    zip_copy_leng = n;

    n = 0;
    while(zip_copy_leng > 0 && n < size) {
	zip_copy_leng--;
	zip_wp &= zip_WSIZE - 1;
	zip_NEEDBITS(8);
	buff[off + n++] = zip_slide[zip_wp++] =
	    zip_GETBITS(8);
	zip_DUMPBITS(8);
    }

    if(zip_copy_leng == 0)
      zip_method = -1; // done
    return n;
}

var zip_inflate_fixed = function(buff, off, size) {
    /* decompress an inflated type 1 (fixed Huffman codes) block.  We should
       either replace this with a custom decoder, or at least precompute the
       Huffman tables. */

    // if first time, set up tables for fixed blocks
    if(zip_fixed_tl == null) {
	var i;			// temporary variable
	var l = new Array(288);	// length list for huft_build
	var h;	// zip_HuftBuild

	// literal table
	for(i = 0; i < 144; i++)
	    l[i] = 8;
	for(; i < 256; i++)
	    l[i] = 9;
	for(; i < 280; i++)
	    l[i] = 7;
	for(; i < 288; i++)	// make a complete, but wrong code set
	    l[i] = 8;
	zip_fixed_bl = 7;

	h = new zip_HuftBuild(l, 288, 257, zip_cplens, zip_cplext,
			      zip_fixed_bl);
	if(h.status != 0) {
	    alert("HufBuild error: "+h.status);
	    return -1;
	}
	zip_fixed_tl = h.root;
	zip_fixed_bl = h.m;

	// distance table
	for(i = 0; i < 30; i++)	// make an incomplete code set
	    l[i] = 5;
	zip_fixed_bd = 5;

	h = new zip_HuftBuild(l, 30, 0, zip_cpdist, zip_cpdext, zip_fixed_bd);
	if(h.status > 1) {
	    zip_fixed_tl = null;
	    alert("HufBuild error: "+h.status);
	    return -1;
	}
	zip_fixed_td = h.root;
	zip_fixed_bd = h.m;
    }

    zip_tl = zip_fixed_tl;
    zip_td = zip_fixed_td;
    zip_bl = zip_fixed_bl;
    zip_bd = zip_fixed_bd;
    return zip_inflate_codes(buff, off, size);
}

var zip_inflate_dynamic = function(buff, off, size) {
    // decompress an inflated type 2 (dynamic Huffman codes) block.
    var i;		// temporary variables
    var j;
    var l;		// last length
    var n;		// number of lengths to get
    var t;		// (zip_HuftNode) literal/length code table
    var nb;		// number of bit length codes
    var nl;		// number of literal/length codes
    var nd;		// number of distance codes
    var ll = new Array(286+30); // literal/length and distance code lengths
    var h;		// (zip_HuftBuild)

    for(i = 0; i < ll.length; i++)
	ll[i] = 0;

    // read in table lengths
    zip_NEEDBITS(5);
    nl = 257 + zip_GETBITS(5);	// number of literal/length codes
    zip_DUMPBITS(5);
    zip_NEEDBITS(5);
    nd = 1 + zip_GETBITS(5);	// number of distance codes
    zip_DUMPBITS(5);
    zip_NEEDBITS(4);
    nb = 4 + zip_GETBITS(4);	// number of bit length codes
    zip_DUMPBITS(4);
    if(nl > 286 || nd > 30)
      return -1;		// bad lengths

    // read in bit-length-code lengths
    for(j = 0; j < nb; j++)
    {
	zip_NEEDBITS(3);
	ll[zip_border[j]] = zip_GETBITS(3);
	zip_DUMPBITS(3);
    }
    for(; j < 19; j++)
	ll[zip_border[j]] = 0;

    // build decoding table for trees--single level, 7 bit lookup
    zip_bl = 7;
    h = new zip_HuftBuild(ll, 19, 19, null, null, zip_bl);
    if(h.status != 0)
	return -1;	// incomplete code set

    zip_tl = h.root;
    zip_bl = h.m;

    // read in literal and distance code lengths
    n = nl + nd;
    i = l = 0;
    while(i < n) {
	zip_NEEDBITS(zip_bl);
	t = zip_tl.list[zip_GETBITS(zip_bl)];
	j = t.b;
	zip_DUMPBITS(j);
	j = t.n;
	if(j < 16)		// length of code in bits (0..15)
	    ll[i++] = l = j;	// save last length in l
	else if(j == 16) {	// repeat last length 3 to 6 times
	    zip_NEEDBITS(2);
	    j = 3 + zip_GETBITS(2);
	    zip_DUMPBITS(2);
	    if(i + j > n)
		return -1;
	    while(j-- > 0)
		ll[i++] = l;
	} else if(j == 17) {	// 3 to 10 zero length codes
	    zip_NEEDBITS(3);
	    j = 3 + zip_GETBITS(3);
	    zip_DUMPBITS(3);
	    if(i + j > n)
		return -1;
	    while(j-- > 0)
		ll[i++] = 0;
	    l = 0;
	} else {		// j == 18: 11 to 138 zero length codes
	    zip_NEEDBITS(7);
	    j = 11 + zip_GETBITS(7);
	    zip_DUMPBITS(7);
	    if(i + j > n)
		return -1;
	    while(j-- > 0)
		ll[i++] = 0;
	    l = 0;
	}
    }

    // build the decoding tables for literal/length and distance codes
    zip_bl = zip_lbits;
    h = new zip_HuftBuild(ll, nl, 257, zip_cplens, zip_cplext, zip_bl);
    if(zip_bl == 0)	// no literals or lengths
	h.status = 1;
    if(h.status != 0) {
	if(h.status == 1)
	    ;// **incomplete literal tree**
	return -1;		// incomplete code set
    }
    zip_tl = h.root;
    zip_bl = h.m;

    for(i = 0; i < nd; i++)
	ll[i] = ll[i + nl];
    zip_bd = zip_dbits;
    h = new zip_HuftBuild(ll, nd, 0, zip_cpdist, zip_cpdext, zip_bd);
    zip_td = h.root;
    zip_bd = h.m;

    if(zip_bd == 0 && nl > 257) {   // lengths but no distances
	// **incomplete distance tree**
	return -1;
    }

    if(h.status == 1) {
	;// **incomplete distance tree**
    }
    if(h.status != 0)
	return -1;

    // decompress until an end-of-block code
    return zip_inflate_codes(buff, off, size);
}

var zip_inflate_start = function() {
    var i;

    if(zip_slide == null)
	zip_slide = new Array(2 * zip_WSIZE);
    zip_wp = 0;
    zip_bit_buf = 0;
    zip_bit_len = 0;
    zip_method = -1;
    zip_eof = false;
    zip_copy_leng = zip_copy_dist = 0;
    zip_tl = null;
}

var zip_inflate_internal = function(buff, off, size) {
    // decompress an inflated entry
    var n, i;

    n = 0;
    while(n < size) {
	if(zip_eof && zip_method == -1)
	    return n;

	if(zip_copy_leng > 0) {
	    if(zip_method != zip_STORED_BLOCK) {
		// STATIC_TREES or DYN_TREES
		while(zip_copy_leng > 0 && n < size) {
		    zip_copy_leng--;
		    zip_copy_dist &= zip_WSIZE - 1;
		    zip_wp &= zip_WSIZE - 1;
		    buff[off + n++] = zip_slide[zip_wp++] =
			zip_slide[zip_copy_dist++];
		}
	    } else {
		while(zip_copy_leng > 0 && n < size) {
		    zip_copy_leng--;
		    zip_wp &= zip_WSIZE - 1;
		    zip_NEEDBITS(8);
		    buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
		    zip_DUMPBITS(8);
		}
		if(zip_copy_leng == 0)
		    zip_method = -1; // done
	    }
	    if(n == size)
		return n;
	}

	if(zip_method == -1) {
	    if(zip_eof)
		break;

	    // read in last block bit
	    zip_NEEDBITS(1);
	    if(zip_GETBITS(1) != 0)
		zip_eof = true;
	    zip_DUMPBITS(1);

	    // read in block type
	    zip_NEEDBITS(2);
	    zip_method = zip_GETBITS(2);
	    zip_DUMPBITS(2);
	    zip_tl = null;
	    zip_copy_leng = 0;
	}

	switch(zip_method) {
	  case 0: // zip_STORED_BLOCK
	    i = zip_inflate_stored(buff, off + n, size - n);
	    break;

	  case 1: // zip_STATIC_TREES
	    if(zip_tl != null)
		i = zip_inflate_codes(buff, off + n, size - n);
	    else
		i = zip_inflate_fixed(buff, off + n, size - n);
	    break;

	  case 2: // zip_DYN_TREES
	    if(zip_tl != null)
		i = zip_inflate_codes(buff, off + n, size - n);
	    else
		i = zip_inflate_dynamic(buff, off + n, size - n);
	    break;

	  default: // error
	    i = -1;
	    break;
	}

	if(i == -1) {
	    if(zip_eof)
		return 0;
	    return -1;
	}
	n += i;
    }
    return n;
}

var zip_inflate = function(str) {
    var i, j, pos = 0;

    zip_inflate_start();
    zip_inflate_data = str;
    zip_inflate_pos = 0;
	
    var buff = new Uint8Array(1024);
	
    var out = [];
    while((i = zip_inflate_internal(buff, 0, buff.length)) > 0)
		for(j = 0; j < i; j++)
			out[pos++] = buff[j];		    
	
    zip_inflate_data = null; // G.C.
    return new Uint8Array(out);
}

if (! ctx.RawDeflate) ctx.RawDeflate = {};
ctx.RawDeflate.inflate = zip_inflate;

})(this);

/**
 * 	SEA3D.js - SEA3D SDK ( Deflate )
 * 	Copyright (C) 2013 Sunag Entertainment 
 * 
 * 	http://code.google.com/p/sea3d/
 */
 
SEA3D.File.DeflateUncompress = function(data) {	
	return RawDeflate.inflate(data);
}

SEA3D.File.setDecompressionEngine(1, "deflate", SEA3D.File.DeflateUncompress);

/**
 * 	SEA3D.JS + Three.JS
 * 	Copyright (C) 2015 Sunag Entertainment 
 * 
 * 	http://sea3d.poonya.com/
 */

//
//	Shader
//
 
THREE.ShaderLib.replaceCode = function(src, target, replace) {
	for (var i = 0; i < target.length; i++) {
		var tar = target[i],
			rep = replace[i],
			index = src.indexOf(tar);
		
		if (index > -1)
			src = src.substring(0, index) + rep + src.substring(index + tar.length);		
	}	
	
	return src;
}

THREE.ShaderLib['phong'].fragmentShader_StandardMaterial = 
	THREE.ShaderLib.replaceCode( THREE.ShaderLib['phong'].fragmentShader, [
		//	Target
		'outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + ambientLightColor ) * specular + totalSpecularLight + emissive;', // METAL
		'outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + ambientLightColor ) + totalSpecularLight + emissive;'	
	], [
		//	Replace To
		'outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + ambientLightColor + emissive ) * specular + totalSpecularLight;', // METAL
		'outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + ambientLightColor + emissive ) + totalSpecularLight;'	
	] );

//
//	Material ( Emissive to Ambient Color Extension )
//

THREE.MeshPhongMaterial.prototype.emissiveToAmbientColor = false;

THREE.MeshPhongMaterial.prototype.CLONE = THREE.MeshPhongMaterial.prototype.clone;
THREE.MeshPhongMaterial.prototype.clone = function() {
	var mat = this.CLONE();
	mat.emissiveToAmbientColor = this.emissiveToAmbientColor;
	return mat;
}

THREE.MeshPhongMaterial.prototype.__defineSetter__("__webglShader", function(val){
	if (this.emissiveToAmbientColor) val.fragmentShader = THREE.ShaderLib['phong'].fragmentShader_StandardMaterial;
	this.__webglShader__ = val;
});
THREE.MeshPhongMaterial.prototype.__defineGetter__("__webglShader", function(){
	return this.__webglShader__;
});

//
//	Mesh
//

// Local Animation
THREE.Object3D.prototype.UPDATEMATRIXWORLD = THREE.Mesh.prototype.updateMatrixWorld;
THREE.Object3D.prototype.updateMatrixWorld = function(force) {
	if (this.animateMatrix) {
		this.UPDATEMATRIXWORLD(force);
		
		this.animateMatrix.compose( this.animatePosition, this.animateQuaternion, this.animateScale );
		
		this.matrixWorld.multiplyMatrices( this.matrixWorld, this.animateMatrix );
	}
	else this.UPDATEMATRIXWORLD(force);
}

THREE.Object3D.prototype.setAnimateMatrix = function(val) {
	if (this.getAnimateMatrix() == val) return;
	
	if (val) {
		this.animateMatrix = new THREE.Matrix4();
		
		this.animatePosition = new THREE.Vector3();		
		this.animateQuaternion = new THREE.Quaternion();
		this.animateScale = new THREE.Vector3(1,1,1);
	} else {
		delete this.animateMatrix;
		
		delete this.animatePosition;
		delete this.animateQuaternion;
		delete this.animateScale;		
	}	
	
	this.matrixWorldNeedsUpdate = true;
}
 
THREE.Object3D.prototype.getAnimateMatrix = function() {
	return this.animateMatrix != null;
}
 
THREE.Mesh.prototype.setWeight = function(name, val) {
	this.morphTargetInfluences[ this.geometry.morphTargets[name] ] = val;
}

THREE.Mesh.prototype.getWeight = function(name) {
	return this.morphTargetInfluences[ this.geometry.morphTargets[name] ];
}

THREE.Mesh.prototype.DISPOSE = THREE.Mesh.prototype.dispose;
THREE.Mesh.prototype.dispose = function () {	
	if (this.animation) this.animation.dispose();
	this.DISPOSE();
}

THREE.Mesh.prototype.CLONE = THREE.Mesh.prototype.clone;
THREE.Mesh.prototype.clone = function ( object ) {
	var cloned = THREE.Mesh.prototype.CLONE.call( this, object );
	
	if (cloned.animation)
		cloned.animation = this.animation.clone( cloned );
	
	return obj;
}

//
//	Skinning
//

THREE.SkinnedMesh.prototype.stop = function() {
	if (this.currentAnimation) {
		this.currentAnimation.stop();
		this.currentAnimation = null;		
		this.isPlaying = false;
	}
}

THREE.SkinnedMesh.prototype.pause = function() {
	if (this.isPlaying) {
		this.currentAnimation.pause();			
		this.isPlaying = false;		
	}
}

THREE.SkinnedMesh.prototype.resume = function() {
	if (!this.isPlaying && this.currentAnimation) {
		this.currentAnimation.pause();			
		this.isPlaying = true;
	}
}

THREE.SkinnedMesh.prototype.isPlaying = false;

THREE.SkinnedMesh.prototype.play = function(name, crossfade, offset) {	
	this.previousAnimation = this.currentAnimation;
	this.currentAnimation = this.animations[name];
	
	if (!this.currentAnimation)
		throw new Error('Animation "' + name + '" not found.');
	
	if (this.previousAnimation && this.previousAnimation !== this.currentAnimation && crossfade > 0) {					
		
		this.previousAnimation.play(this.previousAnimation.currentTime, this.previousAnimation.weight);
		this.currentAnimation.play(offset !== undefined ? offset : this.currentAnimation.currentTime, this.currentAnimation.weight);
		
		THREE.AnimationHandler.addCrossfade( this, crossfade );		
		
	} else {
		this.currentAnimation.play(offset !== undefined ? offset : this.currentAnimation.currentTime, 1);
	}		
	
	this.isPlaying = true;
}

THREE.SkinnedMesh.prototype.setAnimations = function(animations) {
	this.animations = [];	
	this.weightSchedule = [];
	this.warpSchedule = [];
	
	var nsIndex = animations[0].name.indexOf("/")+1;
	this.animationNamespace = animations[0].name.substring(0, nsIndex);		
	
	for (var i = 0; i < animations.length; i++) {								
		var ns = animations[i].name;	
		var name = ns.substring(nsIndex);		
		
		this.animations[i] = new THREE.Animation( this, animations[i]);
		this.animations[i].loop = animations[i].repeat;
		this.animations[i].name = name;		
		
		this.animations[name] = this.animations[i];
	}
}

THREE.SkinnedMesh.prototype.DISPOSE = THREE.SkinnedMesh.prototype.dispose;
THREE.SkinnedMesh.prototype.dispose = function () {	
	this.stop();
	this.animations = null;	
	this.DISPOSE();
}

THREE.SkinnedMesh.prototype.CLONE = THREE.SkinnedMesh.prototype.clone;
THREE.SkinnedMesh.prototype.clone = function ( object ) {

	var cloned = THREE.SkinnedMesh.prototype.CLONE.call( this, object );
	
	if (cloned.animation)
		cloned.animation = this.animation.clone( cloned );
	
	cloned.animations = [];
	
	var refAnimations = this.geometry.animations;
	var nsIndex = refAnimations[0].name.indexOf("/")+1;
	
	for (var i = 0; i < refAnimations.length; i++) {
		var name = refAnimations[i].name.substring(nsIndex);
		var data = refAnimations[i];
		
		data.initialized = false;
		
		cloned.animations[i] = new THREE.Animation( cloned, data );
		cloned.animations[i].loop = refAnimations[i].repeat;
		cloned.animations[i].name = name;
	}
	
	return cloned;
}

//
//	Three.JS Skeleton Animation Crossfade Extension
//

THREE.AnimationHandler.crossfade = [];
THREE.AnimationHandler.UPDATE = THREE.AnimationHandler.update;

THREE.AnimationHandler.update = function( dt ) {
	var i, cf = THREE.AnimationHandler.crossfade;
	
	//	Crossfade	
	i = 0;
	while ( i < cf.length ) {
		var mesh = cf[i];
		
		mesh.currentAnimation.weight += dt / mesh.crossfade;						
		
		if (mesh.currentAnimation.weight > 1) {
			mesh.previousAnimation.weight = 0;						
			mesh.currentAnimation.weight = 1;			
			
			if (mesh.onCrossfadeComplete)
				mesh.onCrossfadeComplete( mesh );
			
			cf.splice( i, 1 );
			
			delete mesh.crossfade;			
		} else 
			++i;		
		
		mesh.previousAnimation.weight = 1 - mesh.currentAnimation.weight;
	}	
	
	THREE.AnimationHandler.UPDATE( dt );
}

THREE.AnimationHandler.addCrossfade = function( mesh, crossfade ) {	
	if (mesh.crossfade !== undefined)
		THREE.AnimationHandler.crossfade.splice( THREE.AnimationHandler.crossfade.indexOf( mesh ), 1 );
	
	mesh.crossfade = crossfade;	
	
	THREE.AnimationHandler.crossfade.push( mesh );
}

//
//	Animation Event Extension
//

THREE.Animation.prototype.STOP = THREE.Animation.prototype.stop;
THREE.Animation.prototype.stop = function() {
	if (this.onComplete)
		this.onComplete( this );
	
	this.STOP();
}

THREE.Animation.prototype.RESET = THREE.Animation.prototype.reset;
THREE.Animation.prototype.reset = function() {
	if (this.onReset)
		this.onReset( this );
	
	this.RESET();
}

//
//	Sound3D
//

THREE.Sound3D = function( src, volume, distance ) {	
	THREE.Object3D.call( this );
	
	this.audio = new Audio();	
	this.audio.src = src;	
	this.audio.load();		
	
	this.distance = distance !== undefined ? distance : 1000;
	this.volume = volume !== undefined ? volume : 1;
	
	this.playing = false;
}

THREE.Sound3D.prototype = Object.create( THREE.Object3D.prototype );

THREE.Sound3D.prototype.loop = false;

THREE.Sound3D.prototype.play = function(offset) {
	if (offset !== undefined && this.audio.duration > 0)
	{		
		this.audio.currentTime = offset;	
	}
	
	this.audio.loop = this.loop;
	this.audio.play();	
	
	if (!this.playing)
	{		
		this.index = THREE.Sound3D.sounds.length;
		THREE.Sound3D.sounds.push( this );
		this.playing = true;
	}
}

THREE.Sound3D.prototype.stop = function() {
	if (this.audio.duration > 0) 
		this.audio.currentTime = 0;
	
	this.pause();	
}

THREE.Sound3D.prototype.pause = function() {
	this.audio.pause();	
	
	if (this.playing)
	{
		THREE.Sound3D.sounds.splice( this.index, 1 );
		this.playing = false;
	}
}

THREE.Sound3D.prototype.update = function( camera ) {
	var soundPosition = new THREE.Vector3();
	soundPosition.setFromMatrixPosition( this.matrixWorld );
	
	var cameraPosition = new THREE.Vector3();
	cameraPosition.setFromMatrixPosition( camera.matrixWorld );		
	
	var distance = soundPosition.distanceTo( cameraPosition );

	var volume = this.volume * (1 - ( distance / (this.distance * 3) ));
	
	this.audio.volume = Math.max(0, Math.min(1, volume));
}

THREE.Sound3D.sounds = [];

THREE.Sound3D.update = function( camera ) {
	var sounds = THREE.Sound3D.sounds;
	for(var i = 0; i < sounds.length; i++) {
		sounds[i].update( camera );
	}
}

//
//	Bone Extension (Joint Object)
//

THREE.Bone.fromName = function(mesh, name) {
	var bones = mesh.bones;
	
	for(var i = 0, bl = bones.length; i < bl; i++)
	{
		if (name == bones[i].name)
		{
			return bones[i];
		}
	}
}

//
//	SEA3D
//
 
THREE.SEA3D = function(config) {
	this.config = config || {};
		
	if (this.config.autoPlay === undefined) this.config.autoPlay = false;
	if (this.config.flip === undefined) this.config.flip = true;
	if (this.config.parser == undefined) this.config.parser = THREE.SEA3D.AUTO;
	if (this.config.multiplier == undefined) this.config.multiplier = 1;
	if (this.config.tangent == undefined) this.config.tangent = true;
	if (this.config.bounding == undefined) this.config.bounding = true;	
		
	this.container = this.config.container || new THREE.Object3D();	
	this.objects = {};	
}

THREE.SEA3D.prototype = {
	constructor: THREE.SEA3D,
	
	addEventListener: THREE.EventDispatcher.prototype.addEventListener,
	hasEventListener: THREE.EventDispatcher.prototype.hasEventListener,
	removeEventListener: THREE.EventDispatcher.prototype.removeEventListener,
	dispatchEvent: THREE.EventDispatcher.prototype.dispatchEvent
}

//
//	Config
//

THREE.SEA3D.BUFFER0 = new THREE.Matrix4();
THREE.SEA3D.BUFFER1 = new THREE.Matrix4();
THREE.SEA3D.BUFFER2 = new THREE.Matrix4();
THREE.SEA3D.BUFFER3 = new THREE.Matrix4();
THREE.SEA3D.QUABUF0 = new THREE.Quaternion();
THREE.SEA3D.QUABUF1 = new THREE.Quaternion();
THREE.SEA3D.VECBUF0 = new THREE.Vector3();
THREE.SEA3D.VECBUF1 = new THREE.Vector3();
THREE.SEA3D.CONTAINER = new THREE.Object3D();

THREE.SEA3D.VECZERO = new THREE.Vector3();

THREE.SEA3D.AUTO = 'auto'; 
THREE.SEA3D.DEFAULT = 'default';
THREE.SEA3D.BUFFER = 'buffer';

THREE.SEA3D.BACKGROUND_COLOR = 0x333333;
THREE.SEA3D.HELPER_COLOR = 0x9AB9E5;
THREE.SEA3D.TEXTURE_SIZE = 512;

THREE.SEA3D.prototype.setShadowMap = function(light, opacity) {
	light.shadowMapWidth = 
	light.shadowMapHeight = 2048;
	
	light.castShadow = true;
	light.shadowDarkness = opacity !== undefined ? opacity : 1;
}

//
//	Output
//

THREE.SEA3D.prototype.getMesh = function(name) {
	return this.objects["m3d/" + name];
}

THREE.SEA3D.prototype.getDummy = function(name) {
	return this.objects["dmy/" + name];
}

THREE.SEA3D.prototype.getLine = function(name) {
	return this.objects["line/" + name];
}

THREE.SEA3D.prototype.getSound3D = function(name) {
	return this.objects["sn3d/" + name];
}

THREE.SEA3D.prototype.getMaterial = function(name) {
	return this.objects["mat/" + name];
}

THREE.SEA3D.prototype.getLight = function(name) {
	return this.objects["lht/" + name];
}

THREE.SEA3D.prototype.getCamera = function(name) {
	return this.objects["cam/" + name];
}

THREE.SEA3D.prototype.getTexture = function(name) {
	return this.objects["tex/" + name];
}

THREE.SEA3D.prototype.getCubeMap = function(name) {
	return this.objects["cmap/" + name];
}

THREE.SEA3D.prototype.getJointObject = function(name) {
	return this.objects["jnt/" + name];
}

THREE.SEA3D.prototype.getContainer3D = function(name) {
	return this.objects["c3d/" + name];
}

THREE.SEA3D.prototype.getSprite = function(name) {
	return this.objects["m2d/" + name];
}

//
//	Utils
//

THREE.SEA3D.prototype.isPowerOfTwo = function(num) {
	return num ? ((num & -num) == num) : false;
}

THREE.SEA3D.prototype.nearestPowerOfTwo = function(num) {
	return Math.pow( 2, Math.round( Math.log( num ) / Math.LN2 ) );
}

THREE.SEA3D.prototype.vectorToVector3 = function(list) {
	var n = [];	
	var i = 0, j = 0;
	while(i < list.length)
		n[j++] = new THREE.Vector3(list[i++], list[i++], list[i++]);
	return n;
}

THREE.SEA3D.prototype.vectorToVector3Inv = function(list) {
	var n = [];	
	var i = 0, j = 0;
	while(i < list.length)
		n[j++] = new THREE.Vector3(list[i++], list[i++], -list[i++]);
	return n;
}

THREE.SEA3D.prototype.flipMatrixScale = function(mtx) {
	mtx.decompose( THREE.SEA3D.VECBUF0, THREE.SEA3D.QUABUF0, THREE.SEA3D.VECBUF1 );	
	THREE.SEA3D.VECBUF1.z = -THREE.SEA3D.VECBUF1.z;	
	mtx.compose( THREE.SEA3D.VECBUF0, THREE.SEA3D.QUABUF0, THREE.SEA3D.VECBUF1 );			
	return mtx;
}

THREE.SEA3D.prototype.flipMatrixGlobal = function(mtx) {
	mtx.decompose( THREE.SEA3D.VECBUF0, THREE.SEA3D.QUABUF0, THREE.SEA3D.VECBUF1 );	
	THREE.SEA3D.VECBUF1.z = -THREE.SEA3D.VECBUF1.z;	
	THREE.SEA3D.VECBUF1.y = -THREE.SEA3D.VECBUF1.y;
	THREE.SEA3D.VECBUF1.x = -THREE.SEA3D.VECBUF1.x;	
	mtx.compose( THREE.SEA3D.VECBUF0, THREE.SEA3D.QUABUF0, THREE.SEA3D.VECBUF1 );			
	return mtx;
}

THREE.SEA3D.prototype.flipMatrix = function(mtx) {
	var mtx_data = THREE.SEA3D.BUFFER0.copy( mtx );
	
	mtx.setPosition( THREE.SEA3D.VECZERO );	
	mtx.multiplyMatrices( THREE.SEA3D.BUFFER1.makeRotationAxis( THREE.SEA3D.VECBUF0.set(0, 0, 1), THREE.Math.degToRad( 180 ) ), mtx );		
	mtx.makeRotationFromQuaternion( THREE.SEA3D.QUABUF0.setFromRotationMatrix( mtx ) );	
	
	var pos = THREE.SEA3D.VECBUF0.setFromMatrixPosition( mtx_data );
	pos.z = -pos.z;
	mtx.setPosition(pos);
	
	return mtx;
}

THREE.SEA3D.prototype.applyMatrix = function(obj3d, mtx) {
	var vec = THREE.SEA3D.VECBUF0;
	
	obj3d.position.setFromMatrixPosition( mtx );		
	obj3d.scale.setFromMatrixScale( mtx );
	
	// ignore rotation scale
	mtx.scale( vec.set( 1 / obj3d.scale.x, 1 / obj3d.scale.y, 1 / obj3d.scale.z ) );		
	obj3d.rotation.setFromRotationMatrix( mtx );
}

THREE.SEA3D.prototype.updateMatrix = function(obj3d) {
	var buf = THREE.SEA3D.BUFFER2;
	var buf1 = THREE.SEA3D.BUFFER3;	
	
	// convert to global
	
	obj3d.updateMatrixWorld();
	buf.copy( obj3d.matrixWorld );
	
	this.flipMatrixScale( buf ); // flip matrix
	
	// convert to local
			
	buf1.copy( obj3d.parent.matrixWorld );
	
	if (obj3d.parent instanceof THREE.Bone)
		this.flipMatrixGlobal( buf1 );	
	else 
		this.flipMatrixScale( buf1 );	
	
	buf1.getInverse( buf1 );
	
	buf.multiplyMatrices( buf1, buf );		
	
	this.applyMatrix(obj3d, buf);
}

THREE.SEA3D.prototype.updateTransform = function(obj3d, sea) {
	var buf = THREE.SEA3D.BUFFER2;
	
	if (sea.transform)
		buf.elements = sea.transform;
	else
		buf.makeTranslation(sea.position.x, sea.position.y, sea.position.z);
		
	// matrix
	
	this.applyMatrix(obj3d, buf);
	
	// flip matrix
	
	this.updateMatrix(obj3d);
	
	// optimize if is static
	
	if (sea.isStatic) {
		obj3d.updateMatrixWorld();
		obj3d.matrixAutoUpdate = false;		
	} 			
}

THREE.SEA3D.prototype.updateAnimationSet = function(obj3d) {
	var buf = THREE.SEA3D.BUFFER2;
	var anmSet = obj3d.animation.animationSet;
		
	if (anmSet.flip)
		return;
	
	var anms = anmSet.animations;
	
	for (var i = 0; i < anms.length; i++) {
		var dataList = anms[i].dataList;				
		var t_anm = [], j;		
				
		for (j = 0; j < dataList.length; j++) {
			var data = dataList[i];	
			var raw = dataList[i].data;	
			var kind = data.kind;
			var numFrames = raw.length / data.blockLength;			
			
			switch(kind) {
				case SEA3D.Animation.POSITION:
				case SEA3D.Animation.ROTATION:
					t_anm.push( {
						kind : kind,
						numFrames : numFrames,
						raw : raw						
					} );
					break;
			}
		}
		
		if (t_anm.length > 0) {	
			
			var numFrames = t_anm[0].numFrames,
				ct = THREE.SEA3D.CONTAINER;
			
			ct.position.set(0, 0, 0);
			ct.rotation.set(0, 0, 0);
			ct.scale.set(1, 1, 1);
						
			obj3d.add( ct );
			
			for (var f = 0, t, c; f < numFrames; f++) {									
				
				for (t = 0; t < t_anm.length; t++) {				
					
					var raw = t_anm[t].raw,
						kind = t_anm[t].kind;
					
					switch(kind) {
						case SEA3D.Animation.POSITION:
							
							c = f * 3;
							
							ct.position.set(
								raw[c    ], 
								raw[c + 1], 
								raw[c + 2]
							);			
													
							break;
							
						case SEA3D.Animation.ROTATION:
							
							c = f * 4;
							
							ct.quaternion.set(
								raw[c    ], 
								raw[c + 1], 
								raw[c + 2],
								raw[c + 3]
							);

							break;
					}					
				}	
				
				this.updateMatrix( ct );
				
				for (t = 0; t < t_anm.length; t++) {				
					
					var raw = t_anm[t].raw,				
						kind = t_anm[t].kind;
					
					switch(kind) {
						case SEA3D.Animation.POSITION:
							
							c = f * 3;														
																					
							raw[c    ] = ct.position.x;
							raw[c + 1] = ct.position.y;
							raw[c + 2] = ct.position.z;																									
						
							break;
							
						case SEA3D.Animation.ROTATION:
							
							c = f * 4;

							raw[c    ] = ct.quaternion.x;
							raw[c + 1] = ct.quaternion.y;
							raw[c + 2] = ct.quaternion.z;
							raw[c + 3] = ct.quaternion.w;
							
							break;
					}					
				}
			}

			obj3d.remove( ct );			
		}
	}
	
	anmSet.flip = true;
}

THREE.SEA3D.prototype.vectorToColor = function(list) {
	var n = [];
	var i = 0, j = 0;
	var r, g, b, a;
	while(i < list.length) {
		r = list[i++] * 0xFF;
		g = list[i++] * 0xFF;
		b = list[i++] * 0xFF;
		a = list[i++] * 0xFF;
		
		n[j++] = new THREE.Color(a << 24 | r << 16 | g << 8 | b);
	}
	return n;
}

THREE.SEA3D.prototype.vectorToUV = function(list) {
	var uvs = [];
	for(var ch=0;ch<list.length;ch++) {
		var uv_ch = uvs[ch] = [];
		var uv = list[ch];
		for(var i=0,j=0;i<uv.length;i+=2) {
			uv_ch[j++] = new THREE.Vector2(uv[i], uv[i+1]);
		}
	}
	return uvs;
}

THREE.SEA3D.prototype.toVector3 = function(data) {
	return new THREE.Vector3(data.x, data.y, data.z);
}

THREE.SEA3D.prototype.scaleColor = function(color, scale) {
	var r = (color >> 16) * scale;
    var g = (color >> 8 & 0xFF) * scale;
    var b = (color & 0xFF) * scale;

    return (r << 16 | g << 8 | b);
}

THREE.SEA3D.prototype.updateScene = function () {
	if (this.materials != undefined) {
		for(var i = 0, l = this.materials.length; i < l; ++i) {
			this.materials[i].needsUpdate = true;
		}		
	}
}

THREE.SEA3D.prototype.addSceneObject = function(sea) {
	if (sea.parent)			
		sea.parent.tag.add( sea.tag ); 
	else if (this.config.container)
		this.config.container.add( sea.tag );
	else
		this.container.add( sea.tag );
}

THREE.SEA3D.prototype.bufferToTexture = function(raw) {
	return "data:image/png;base64," + SEA3D.Stream.bufferToBase64(raw);
}

THREE.SEA3D.prototype.bufferToSound = function(raw) {
	return "data:audio/mp3;base64," + SEA3D.Stream.bufferToBase64(raw);
}

THREE.SEA3D.prototype.applyDefaultAnimation = function(sea, ANIMATOR_CLASS) {
	var obj = sea.tag;
	
	for(var i = 0, count = sea.animations ? sea.animations.length : 0; i < count; i++) {
		var anm = sea.animations[i];			
		
		switch(anm.tag.type) {
			case SEA3D.Animation.prototype.type:
				obj.animation = new ANIMATOR_CLASS(obj, anm.tag.tag);
				obj.animation.setRelative( anm.relative );
		
				if (this.config.flip)
					this.updateAnimationSet(obj);
		
				if (this.config.autoPlay) 
					obj.animation.play( obj.animation.getStateNameByIndex(0) );
				
				return obj.animation;
				break;
		}
	}
}

//
//	Animation
//

THREE.SEA3D.prototype.readAnimation = function(sea) {
	var anmSet = new SEA3D.AnimationSet();
	
	for(var i = 0; i < sea.sequence.length; i++) {
		var seq = sea.sequence[i],		
			node = new SEA3D.AnimationNode(seq.name, sea.frameRate, seq.count, seq.repeat, seq.intrpl);
		
		for(var j = 0; j < sea.dataList.length; j++) {				
			var anmData = sea.dataList[j];						
			node.addData( new SEA3D.AnimationData(anmData.kind, anmData.type, anmData.data, seq.start * anmData.blockSize) );
		}
		
		anmSet.addAnimation( node );
	}
	
	this.animationSets = this.animationSets || [];
	this.animationSets.push(this.objects[sea.name + '.#anm'] = sea.tag = anmSet);
}

//
//	Object3D Animator
//

THREE.SEA3D.Object3DAnimator = function(object3d, animationSet) {
	SEA3D.AnimationHandler.call( this, animationSet );	
	this.object3d = object3d;	
}

THREE.SEA3D.Object3DAnimator.prototype = Object.create( SEA3D.AnimationHandler.prototype );

THREE.SEA3D.Object3DAnimator.prototype.STOP = THREE.SEA3D.Object3DAnimator.prototype.stop;
THREE.SEA3D.Object3DAnimator.prototype.stop = function() {
	if (this.relative) {
		this.object3d.animatePosition = new THREE.Vector3();		
		this.object3d.animateQuaternion = new THREE.Quaternion();
		this.object3d.animateScale = new THREE.Vector3(1,1,1);
	}
	
	this.STOP();	
}

THREE.SEA3D.Object3DAnimator.prototype.setRelative = function(val) {
	this.object3d.setAnimateMatrix( this.relative = val );	
}

THREE.SEA3D.Object3DAnimator.prototype.updateAnimationFrame = function(frame, kind) {
	if (this.relative) {		
		switch(kind) {
			case SEA3D.Animation.POSITION:	
				var v = frame.toVector();
				this.object3d.animatePosition.set(v.x, v.y, v.z);	
				break;
				
			case SEA3D.Animation.ROTATION:			
				var v = frame.toVector();				
				this.object3d.animateQuaternion.set(v.x, v.y, v.z, v.w);
				break;	
				
			case SEA3D.Animation.SCALE:	
				var v = frame.toVector();		
				this.object3d.animateScale.set(v.x, v.y, v.z);
				break;
		}
		
		this.object3d.matrixWorldNeedsUpdate = true;
	} else {
		switch(kind) {
			case SEA3D.Animation.POSITION:					
				var v = frame.toVector();
				this.object3d.position.set(v.x, v.y, v.z);				
				break;
				
			case SEA3D.Animation.ROTATION:		
				var v = frame.toVector();				
				this.object3d.quaternion.set(v.x, v.y, v.z, v.w);
				break;	
				
			case SEA3D.Animation.SCALE:	
				var v = frame.toVector();
				this.object3d.scale.set(v.x, v.y, v.z);
				break;
		}
	}
}

//
//	Camera Animator
//

THREE.SEA3D.CameraAnimator = function(object3d, animationSet) {
	THREE.SEA3D.Object3DAnimator.call( this, object3d, animationSet );	
}

THREE.SEA3D.CameraAnimator.prototype = Object.create( THREE.SEA3D.Object3DAnimator.prototype );

THREE.SEA3D.CameraAnimator.prototype.updateAnimationFrame = function(frame, kind) {
	switch(kind) {
		case SEA3D.Animation.FOV:	
			this.object3d.fov = frame.getX();
			break;	
	
		default:	
			this.$updateAnimationFrame(frame, kind);
			break;
	}
}

THREE.SEA3D.CameraAnimator.prototype.$updateAnimationFrame = THREE.SEA3D.Object3DAnimator.prototype.updateAnimationFrame;

//
//	Light Animator
//

THREE.SEA3D.LightAnimator = function(object3d, animationSet) {
	THREE.SEA3D.Object3DAnimator.call( this, object3d, animationSet );	
}

THREE.SEA3D.LightAnimator.prototype = Object.create( THREE.SEA3D.Object3DAnimator.prototype );

THREE.SEA3D.LightAnimator.prototype.updateAnimationFrame = function(frame, kind) {
	switch(kind) {
		case SEA3D.Animation.COLOR:	
			this.object3d.color.setHex( frame.getX() );			
			break;	
			
		case SEA3D.Animation.MULTIPLIER:		
			this.object3d.intensity = frame.getX();
			break;
			
		default:			
			this.$updateAnimationFrame(frame, kind);
			break;
	}
}

THREE.SEA3D.LightAnimator.prototype.$updateAnimationFrame = THREE.SEA3D.Object3DAnimator.prototype.updateAnimationFrame;

//
//	Geometry
//

THREE.SEA3D.prototype.readGeometrySwitch = function(sea) {
	if (sea.numVertex < 0xFFFE && !sea.joint && (!sea.uv || sea.uv.length === 1) && sea.indexes.length === 1)
	{
		this.readGeometryBuffer(sea);
	}
	else
	{
		this.readGeometry(sea);
	}
}

THREE.SEA3D.prototype.readGeometryBuffer = function(sea) {
	var	index = sea.indexes[0],
		count = index.length,
		geo = new THREE.BufferGeometry();
	
	var indices, position, normals, uv, colors;
			
	geo.attributes = {
		
		index : {
			itemSize: 1,
			array: indices = new Uint16Array( count )
		},
		
		position : {
			itemSize: 3,
			array: position = new Float32Array( count * 3 )
		},
			
		uv : {
			itemSize: 2,
			array: uv = new Float32Array( count * 2 )
		}
	}
	
	var a, b, c,
		v = sea.vertex,
		n = sea.normal,
		t = sea.tangent,
		u = sea.uv ? sea.uv[0] : undefined;
	var vc = sea.color ? sea.color[0] : undefined;
	
	if (n)
	{
		geo.attributes.normal = {
			itemSize: 3,
			array: normals = new Float32Array( count * 3 )
		}
	}
	
	if (t)
	{
		geo.attributes.tangent = {
			itemSize: 3,
			array: normals = new Float32Array( count * 3 )
		}
	}
	
	if (vc)
	{
		geo.attributes.color = {
			itemSize: 3,
			array: colors = new Float32Array( count * 3 )
		}
	}
	
	var flip = this.config.flip ? -1 : 1;
	
	for (var f = 0, vt = 0, vu=0; f < count; f+=3, vt+=9, vu+=6) {
	
		// index
	
		a = index[ f     ] * 3;
		b = index[ f + 2 ] * 3;
		c = index[ f + 1 ] * 3;
		
		// position
		
		position[ vt     ] = v[ a     ];
		position[ vt + 1 ] = v[ a + 1 ];
		position[ vt + 2 ] = v[ a + 2 ] * flip;
		
		position[ vt + 3 ] = v[ b     ];
		position[ vt + 4 ] = v[ b + 1 ];
		position[ vt + 5 ] = v[ b + 2 ] * flip;
		
		position[ vt + 6 ] = v[ c     ];
		position[ vt + 7 ] = v[ c + 1 ];
		position[ vt + 8 ] = v[ c + 2 ] * flip;
		
		// normal
		
		if (n)
		{
			normals[ vt     ] = n[ a     ];
			normals[ vt + 1 ] = n[ a + 1 ];
			normals[ vt + 2 ] = n[ a + 2 ] * flip;
			
			normals[ vt + 3 ] = n[ b     ];
			normals[ vt + 4 ] = n[ b + 1 ];
			normals[ vt + 5 ] = n[ b + 2 ] * flip;
			
			normals[ vt + 6 ] = n[ c     ];
			normals[ vt + 7 ] = n[ c + 1 ];
			normals[ vt + 8 ] = n[ c + 2 ] * flip;
		}
		
		// tangent
		
		if (t)
		{
			tangent[ vt     ] = t[ a     ];
			tangent[ vt + 1 ] = t[ a + 1 ];
			tangent[ vt + 2 ] = t[ a + 2 ] * flip;
			
			tangent[ vt + 3 ] = t[ b     ];
			tangent[ vt + 4 ] = t[ b + 1 ];
			tangent[ vt + 5 ] = t[ b + 2 ] * flip;
			
			tangent[ vt + 6 ] = t[ c     ];
			tangent[ vt + 7 ] = t[ c + 1 ];
			tangent[ vt + 8 ] = t[ c + 2 ] * flip;
		}
		
		// uv		
		
		if (u)
		{
			a = index[ f     ] * 2;
			b = index[ f + 2 ] * 2;
			c = index[ f + 1 ] * 2;
			
			uv[ vu     ] = u[ a     ];
			uv[ vu + 1 ] = u[ a + 1 ];
		
			uv[ vu + 2 ] = u[ b     ];
			uv[ vu + 3 ] = u[ b + 1 ];
			
			uv[ vu + 4 ] = u[ c     ];
			uv[ vu + 5 ] = u[ c + 1 ];
		}
		else
		{
			uv[ vu     ] = 0;
			uv[ vu + 1 ] = 0;
		
			uv[ vu + 2 ] = 0;
			uv[ vu + 3 ] = 1;		
			
			uv[ vu + 4 ] = 1;
			uv[ vu + 5 ] = 1;
		}
		
		// colors
		
		if (vc)
		{
			a = index[ f     ] * 4;
			b = index[ f + 2 ] * 4;
			c = index[ f + 1 ] * 4;
			
			colors[ vt     ] = vc[ a     ];
			colors[ vt + 1 ] = vc[ a + 1 ];
			colors[ vt + 2 ] = vc[ a + 2 ];
			
			colors[ vt + 3 ] = vc[ b     ];
			colors[ vt + 4 ] = vc[ b + 1 ];
			colors[ vt + 5 ] = vc[ b + 2 ];
			
			colors[ vt + 6 ] = vc[ c     ];
			colors[ vt + 7 ] = vc[ c + 1 ];
			colors[ vt + 8 ] = vc[ c + 2 ];
		}
		
		// indices
		
		indices[ f     ] = f;
		indices[ f + 1 ] = f + 1;
		indices[ f + 2 ] = f + 2;
	}	
		
	if (sea.numVertex >= 0xFFFE) {
		console.warn( "SEA3D: Big Mesh is not compatible with geometry buffer." );
		//geo.computeOffsets();
	}	
	
	if (!n)	
		geo.computeVertexNormals();	
	
	if (this.config.tangent && !sea.tangent)
		geo.computeTangents();
		
	if (this.config.bounding)
	{
		geo.computeBoundingBox();
		geo.computeBoundingSphere();
	}
	
	geo.name = sea.name;
	
	sea.tag = geo;
}

THREE.SEA3D.prototype.readGeometry = function(sea) {
	var i, j, k, l,
		geo = new THREE.Geometry(),
		vertex, normal, tangent, color, uv;

	vertex = geo.vertices = this.config.flip ? this.vectorToVector3Inv(sea.vertex) : this.vectorToVector3(sea.vertex);	
	if (sea.normal) normal = this.config.flip ? this.vectorToVector3Inv(sea.normal) : this.vectorToVector3(sea.normal);
	if (sea.tangent) tangent = this.config.flip ? this.vectorToVector3Inv(sea.tangent) : this.vectorToVector3(sea.tangent);
	if (sea.color) color = this.vectorToColor(sea.color[0]);
	
	if (sea.uv) 
	{
		uv = this.vectorToUV(sea.uv);
	
		for (k = 0; k < uv.length; k++) {
			geo.faceVertexUvs[k] = [];
		}
	}
	
	for (i = 0; i < sea.indexes.length; i++) {		
		var indexes = sea.indexes[i];
		var num_index = indexes.length / 3;
		
		for (j = 0; j < num_index; j++) {
			var index = j * 3,
				indexX, indexY, indexZ;
			
			// invert faces order XZY
			indexX = indexes[index];
			indexZ = indexes[index+1];
			indexY = indexes[index+2];
			
			var face = new THREE.Face3( indexX , indexY , indexZ , 
			
				normal ? [ 
					normal[ indexX ] , 
					normal[ indexY ] , 
					normal[ indexZ ]
				] : undefined,
				
				color ? [
					color[ indexX ] ,
					color[ indexY ] ,
					color[ indexZ ]										
				] : undefined,

				i // face index
			);
			
			if (tangent) {
				face.vertexTangents = [ 
					tangent[ indexX ] , 
					tangent[ indexY ] , 
					tangent[ indexZ ]
				];
			}
			
			geo.faces.push(face);
			
			if (uv)
			{
				for (k = 0; k < uv.length; k++) {
					var _uv = [
								uv[k][indexX] ,
								uv[k][indexY] ,
								uv[k][indexZ]	
							  ];
								
					geo.faceVertexUvs[k].push( _uv );
				}
			}
			else
			{
				geo.faceVertexUvs[ 0 ].push( [
					new THREE.Vector2( 0, 0 ),
					new THREE.Vector2( 0, 1 ),
					new THREE.Vector2( 1, 1 )
				] );
			}
		}				
	}
	
	// for skeleton animation
	
	if (sea.joint) {
		var indice_buffer = [0,0,0,0];
		var weight_buffer = [0,0,0,0];
		
		var jointPerVertex = sea.jointPerVertex;
		
		if (jointPerVertex > 4) {
		
			console.warn( "SEA3D: Joint Per Vertex can not be greater than 4 (currently " + sea.jointPerVertex + "). Using compression for joints.\nTip: Use SEA3D Studio for automatic compression." );
			
			for (k = 0; k < sea.joint.length; k+=jointPerVertex) {
				
				var jointIndex = [0];
				
				// get indices with greater influence
				for (l = 1; l < jointPerVertex; l++) {		
					var w = sea.weight[k + l],
						actW = sea.weight[k + jointIndex[0]];
					
					if (w > actW) jointIndex.unshift( l );
					else jointIndex.push( l );
				}
				
				// diferrence
				var w = (1 - ((sea.weight[k + jointIndex[0]] + sea.weight[k + jointIndex[1]] +
							 sea.weight[k + jointIndex[2]] + sea.weight[k + jointIndex[3]]))) / 4;
				
				// compress
				for (l = 0; l < 4; l++) {
					i = jointIndex[l];
					
					indice_buffer[l] = sea.joint[k + i];			
					weight_buffer[l] = sea.weight[k + i] + w;
				}
				
				geo.skinIndices.push( new THREE.Vector4( indice_buffer[0], indice_buffer[1], indice_buffer[2], indice_buffer[3] ) );
				geo.skinWeights.push( new THREE.Vector4( weight_buffer[0], weight_buffer[1], weight_buffer[2], weight_buffer[3] ) );
			}			
		} else {	
			for (k = 0; k < sea.joint.length; k+=jointPerVertex) {
				
				for (l = 0; l < jointPerVertex; l++) {
					indice_buffer[l] = sea.joint[k + l];			
					weight_buffer[l] = sea.weight[k + l];
				}					
				
				geo.skinIndices.push( new THREE.Vector4( indice_buffer[0], indice_buffer[1], indice_buffer[2], indice_buffer[3] ) );
				geo.skinWeights.push( new THREE.Vector4( weight_buffer[0], weight_buffer[1], weight_buffer[2], weight_buffer[3] ) );
			}
		}
	}
	
	if (!sea.normal)
	{
		geo.computeFaceNormals();
		geo.computeVertexNormals();
	}
		
	if (this.config.tangent && !sea.tangent)
		geo.computeTangents();
	
	if (this.config.bounding)
	{
		geo.computeBoundingBox();
		geo.computeBoundingSphere();
	}
	
	geo.name = sea.name;
	
	sea.tag = geo;
}

//
//	Dummy
//

THREE.SEA3D.prototype.readDummy = function(sea) {
	var geo = new THREE.BoxGeometry( sea.width, sea.height, sea.depth, 1, 1, 1 );	
	var mat = new THREE.MeshBasicMaterial( { wireframe: true, color: THREE.SEA3D.HELPER_COLOR } );	
	
	var dummy = new THREE.Mesh( geo, mat );
	dummy.name = sea.name;
	
	this.dummys = this.dummys || [];
	this.dummys.push( this.objects["dmy/" + sea.name] = sea.tag = dummy );
			
	this.addSceneObject( sea );
	this.updateTransform(dummy, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.Object3DAnimator );		
}

//
//	Line
//

THREE.SEA3D.prototype.readLine = function(sea) {	
	var geo = new THREE.Geometry();	
	geo.vertices = this.config.flip ? this.vectorToVector3Inv(sea.vertex) : this.vectorToVector3(sea.vertex);	
	
	if (sea.closed)	
		geo.vertices.push( geo.vertices[0] );	
	
	var line = new THREE.Line( geo, new THREE.LineBasicMaterial( { color: THREE.SEA3D.HELPER_COLOR, linewidth: 3 } ) );	
	line.name = sea.name;
		
	this.lines = this.lines || [];
	this.lines.push( this.objects["line/" + sea.name] = sea.tag = line );		
	
	this.addSceneObject( sea );
	this.updateTransform(line, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.Object3DAnimator );		
}

//
//	Container3D
//

THREE.SEA3D.prototype.readContainer3D = function(sea) {
	var container = new THREE.Object3D();		
	
	this.containers = this.containers || [];
	this.containers.push( this.objects["c3d/" + sea.name] = sea.tag = container );
			
	this.addSceneObject( sea );
	this.updateTransform(container, sea);		
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.Object3DAnimator );		
}

//
//	Mesh2D | Sprite
//

THREE.SEA3D.prototype.readMesh2D = function(sea) {
	var material;
	
	if ( sea.material )
	{
		if ( !sea.material.tag.sprite )
		{
			material = sea.material.tag.sprite = new THREE.SpriteMaterial();
			
			material.map = sea.material.tag.map;
			material.map.flipY = true;
			
			material.color = sea.material.tag.emissive;
			material.opacity = sea.material.tag.opacity;
			material.blending = sea.material.tag.blending;
		}
		else material = sea.material.tag.sprite;
	}
	
	var sprite = new THREE.Sprite( material );
	sprite.name = sea.name;
			
	this.sprites = this.sprites || [];
	this.sprites.push( this.objects["m2d/" + sea.name] = sea.tag = sprite );
	
	this.addSceneObject( sea );		
	this.updateTransform(sprite, sea);
	sprite.scale.set( sea.width, sea.height, 1 );
}

//
//	Mesh
//

THREE.SEA3D.prototype.readMesh = function(sea) {
	var geo = sea.geometry.tag,
		mesh, mat, skeleton, skeletonAnimation, morpher;
		
	for(var i = 0, count = sea.modifiers ? sea.modifiers.length : 0; i < count; i++) {
		var mod = sea.modifiers[i];
		
		switch(mod.type)
		{				
			case SEA3D.Skeleton.prototype.type:
				skeleton = mod;
				geo.bones = skeleton.tag;	
				break;
		
			case SEA3D.Morph.prototype.type:
				morpher = mod;
				break;
		}
	}
	
	for(var i = 0, count = sea.animations ? sea.animations.length : 0; i < count; i++) {
		var anm = sea.animations[i];			
		
		switch(anm.tag.type)
		{
			case SEA3D.SkeletonAnimation.prototype.type:
				skeletonAnimation = anm.tag;
				geo.animations = this.getSkeletonAnimation( skeletonAnimation, skeleton );	
				break;
		}
	}
	
	if (sea.material) {
		if (sea.material.length > 1) {
			var mats = [];
			
			for(var i = 0; i < sea.material.length; i++) {
				mats[i] = sea.material[i].tag;
				mats[i].skinning = skeleton != null;
				mats[i].morphTargets = morpher != null;
				mats[i].morphNormals = false;
				mats[i].vertexColors = sea.geometry.color ? THREE.VertexColors : THREE.NoColors;
			}
			
			mat = new THREE.MeshFaceMaterial( mats );
		} else {
			mat = sea.material[0].tag;
			mat.skinning = skeleton != null;
			mat.morphTargets = morpher != null;
			mat.morphNormals = false;
			mat.vertexColors = sea.geometry.color ? THREE.VertexColors : THREE.NoColors;			
		}
	}
	
	if (morpher)
		geo.morphTargets = this.getMorpher( morpher, sea.geometry );		
	
	if (skeleton) {
		mesh = new THREE.SkinnedMesh( geo, mat, false );				
		
		if (skeletonAnimation) {
			mesh.setAnimations( geo.animations );
			if (this.config.autoPlay) mesh.play( mesh.animations[0].name );
		}
	} else {
		mesh = new THREE.Mesh( geo, mat );
	}
	
	mesh.name = sea.name;
	
	mesh.castShadow = sea.castShadows;
	mesh.receiveShadow = sea.material ? sea.material[0].receiveShadows : true;
	
	this.meshes = this.meshes || [];
	this.meshes.push( this.objects["m3d/" + sea.name] = sea.tag = mesh );
	
	this.addSceneObject( sea );
	this.updateTransform(mesh, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.Object3DAnimator );		
}

//
//	Sound Point
//

THREE.SEA3D.prototype.readSoundPoint = function(sea) {
	var sound3d = new THREE.Sound3D( sea.sound.tag, sea.volume, sea.distance );
	
	if (sea.autoPlay) {
		sound3d.loop = true;
		sound3d.play();
	}
	
	sound3d.name = sea.name;
	
	this.sounds3d = this.sounds3d || [];
	this.sounds3d.push( this.objects["sn3d/" + sea.name] = sea.tag = sound3d );	
	
	this.addSceneObject( sea );
	this.updateTransform(sound3d, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.Object3DAnimator );
}

//
//	Cube Render
//

THREE.SEA3D.prototype.readCubeRender = function(sea) {	
	var cube = new THREE.CubeCamera( 0.1, 5000, THREE.SEA3D.TEXTURE_SIZE );	
	cube.renderTarget.cubeCamera = cube;	
	
	this.cubeRenderers = this.cubeRenderers || [];
	this.cubeRenderers.push( this.objects["rttc/" + sea.name] = sea.tag = cube.renderTarget );	
	
	this.addSceneObject( sea );
	this.updateTransform(cube, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.Object3DAnimator );
}

//
//	Images (WDP, JPEG, PNG and GIF)
//

THREE.SEA3D.prototype.readImage = function(sea) {		
	var image = new Image(), texture = new THREE.Texture(), scope = this;
	
	texture.name = sea.name;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;	
	texture.flipY = false;
	
	image.onload = function () { 		
		if (!scope.isPowerOfTwo(image.width) || 
			!scope.isPowerOfTwo(image.height))
		{		
			var width = scope.nearestPowerOfTwo( image.width ),
				height = scope.nearestPowerOfTwo( image.height );
		
			var canvas = document.createElement( "canvas" );

			canvas.width = width;
			canvas.height = height;

			var ctx = canvas.getContext( "2d" );

			ctx.drawImage( image, 0, 0, width, height );
		
			image = canvas;
		}
		
		texture.image = image;
		texture.needsUpdate = true; 	
	}
	
	image.src = this.bufferToTexture( sea.data.buffer );	
	
	this.textures = this.textures || [];
	this.textures.push( this.objects["tex/" + sea.name] = sea.tag = texture );
}

//
//	Cube Map
//

THREE.SEA3D.prototype.readCubeMap = function(sea) {		
	var images = [], 
		texture = new THREE.Texture();
	
	// xyz(- / +) to xyz(+ / -) sequence
	var faces = [];
	faces[0] = sea.faces[1];
	faces[1] = sea.faces[0];
	faces[2] = sea.faces[3];
	faces[3] = sea.faces[2];
	faces[4] = sea.faces[5];
	faces[5] = sea.faces[4];
	
	images.loadedCount = 0;
	
	texture.name = sea.name;
	texture.image = images;	
	texture.flipY = false;	
	
	for ( var i=0, il=faces.length; i<il; ++i) {
		var cubeImage = new Image();
		images[i] = cubeImage;
		
		cubeImage.onload = function () {			
			if (++images.loadedCount == 6)
				texture.needsUpdate = true;			
		}

		cubeImage.src = this.bufferToTexture( faces[i].buffer );
	}
	
	this.cubmaps = this.cubmaps || [];
	this.cubmaps.push( this.objects["cmap/" + sea.name] = sea.tag = texture );
}

//
//	Sound (MP3, OGG)
//

THREE.SEA3D.prototype.readSound = function(sea) {	
	var sound = this.bufferToSound( sea.data.buffer );
	
	this.sounds = this.sounds || [];
	this.sounds.push( this.objects["snd/" + sea.name] = sea.tag = sound );
}

//
//	Texture URL
//

THREE.SEA3D.prototype.readTextureURL = function(sea) {	
	var texture = THREE.ImageUtils.loadTexture( sea.url );
	
	texture.name = sea.name;
	texture.wrapS = texture.wrapT = THREE.RepeatWrapping;	
	texture.flipY = false;
	
	this.textures = this.textures || [];
	this.textures.push( this.objects["tex/" + sea.name] = sea.tag = texture );
}

//
//	Material
//

THREE.SEA3D.prototype.blendMode = {
	normal:THREE.NormalBlending,
	add:THREE.AdditiveBlending,
	subtract:THREE.SubtractiveBlending,
	multiply:THREE.MultiplyBlending,
	screen:THREE.AdditiveBlending
}

THREE.SEA3D.prototype.materialTechnique =
(function(){
	var techniques = {}
	
	// DEFAULT
	techniques[SEA3D.Material.DEFAULT] = 	
	function(tech, mat) {		
		mat.emissive.setHex(tech.ambientColor);			
		mat.color.setHex(tech.diffuseColor);
		mat.specular.setHex(this.scaleColor(tech.specularColor, tech.specular));
		mat.shininess = tech.gloss;		
	}
	
	// DIFFUSE_MAP	
	techniques[SEA3D.Material.DIFFUSE_MAP] = 	
	function(tech, mat) {							
		mat.map = tech.texture.tag;
		mat.transparent = tech.texture.transparent;
	}
	
	// SPECULAR_MAP
	techniques[SEA3D.Material.SPECULAR_MAP] = 	
	function(tech, mat) {
		mat.specularMap = tech.texture.tag;
	}
	
	// NORMAL_MAP
	techniques[SEA3D.Material.NORMAL_MAP] = 	
	function(tech, mat) {
		mat.normalMap = tech.texture.tag;
	}
	
	// REFLECTION
	techniques[SEA3D.Material.REFLECTION] = 
	techniques[SEA3D.Material.FRESNEL_REFLECTION] = 	
	function(tech, mat) {
		mat.envMap = tech.texture.tag;		
		mat.envMap.mapping = THREE.CubeReflectionMapping;	
		mat.combine = THREE.MixOperation;
		
		mat.reflectivity = tech.alpha;
		
		//if (tech.kind == SEA3D.Material.FRESNEL_REFLECTION) {
			// not implemented
		//}
	}
	
	// REFLECTION_SPHERICAL
	techniques[SEA3D.Material.REFLECTION_SPHERICAL] = 	
	function(tech, mat) {
		mat.envMap = tech.texture.tag;		
		mat.envMap.mapping = THREE.SphericalReflectionMapping;	
		mat.combine = THREE.MixOperation;
		
		mat.reflectivity = tech.alpha;
	}
	
	// REFRACTION
	techniques[SEA3D.Material.REFRACTION_MAP] = 	
	function(tech, mat) {
		mat.envMap = tech.texture.tag;		
		mat.envMap.mapping = THREE.CubeRefractionMapping();		
		
		mat.refractionRatio = tech.ior;
		mat.reflectivity = tech.alpha;
	}
	
	// LIGHT_MAP
	techniques[SEA3D.Material.LIGHT_MAP] = 	
	function(tech, mat) {
		mat.lightMap = tech.texture.tag;
	}
	
	return techniques;
})();

THREE.SEA3D.prototype.readMaterial = function(sea) {	
	var mat = new THREE.MeshPhongMaterial();
	mat.emissiveToAmbientColor = true;
	mat.name = sea.name;
	
	mat.side = sea.bothSides ? THREE.DoubleSide : THREE.FrontSide;
	mat.shading = sea.smooth ? THREE.SmoothShading : THREE.FlatShading;
	
	if (sea.blendMode != "normal" && this.blendMode[sea.blendMode])
		mat.blending = this.blendMode[sea.blendMode];
	
	if (sea.alpha < 1 || mat.blending > THREE.NormalBlending) {
		mat.opacity = sea.alpha;
		mat.transparent = true;
	}
	
	for(var i = 0; i < sea.technique.length; i++) {
		var tech = sea.technique[i];
		
		if (this.materialTechnique[tech.kind])			
			this.materialTechnique[tech.kind].call(this, tech, mat);
	}
	
	if (mat.transparent) {
		mat.alphaTest = sea.alphaThreshold;
	}
	
	this.materials = this.materials || [];
	this.materials.push( this.objects["mat/" + sea.name] = sea.tag = mat );
}

//
//	Point Light
//

THREE.SEA3D.prototype.readPointLight = function(sea) {	
	var light = new THREE.PointLight( sea.color, sea.multiplier * this.config.multiplier );
	light.name = sea.name;
			
	if (sea.shadow)		
		this.setShadowMap(light, sea.shadow.opacity);		
	
	this.lights = this.lights || [];
	this.lights.push( this.objects["lht/" + sea.name] = sea.tag = light );
		
	this.addSceneObject( sea );	
	this.updateTransform(light, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.LightAnimator );	
	
	this.updateScene();
}

//
//	Directional Light
//

THREE.SEA3D.prototype.readDirectionalLight = function(sea) {	
	var light = new THREE.DirectionalLight( sea.color, sea.multiplier * this.config.multiplier );	
	light.name = sea.name;
			
	if (sea.shadow)		
		this.setShadowMap(light, sea.shadow.opacity);			
	
	this.lights = this.lights || [];
	this.lights.push( this.objects["lht/" + sea.name] = sea.tag = light );
	
	this.addSceneObject( sea );	
	this.updateTransform(light, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.LightAnimator );		
	
	this.updateScene();
}

//
//	Camera
//

THREE.SEA3D.prototype.readCamera = function(sea) {	
	var camera = new THREE.PerspectiveCamera( sea.fov );	
	camera.name = sea.name;
			
	this.cameras = this.camera || [];
	this.cameras.push( this.objects["cam/" + sea.name] = sea.tag = camera );
	
	this.addSceneObject( sea );	
	this.updateTransform(camera, sea);
	
	this.applyDefaultAnimation( sea, THREE.SEA3D.CameraAnimator );		
}

//
//	Skeleton
//

THREE.SEA3D.prototype.readSkeleton = function(sea) {		
	var bones = [],		
		mtx_inv = new THREE.Matrix4(),
		mtx = new THREE.Matrix4(),
		mtx_loc = new THREE.Matrix4(),
		pos = new THREE.Vector3(),
		quat = new THREE.Quaternion();
	
	for (var i = 0; i < sea.joint.length; i++)
	{
		var bone = sea.joint[i]			
		
		mtx_inv.elements = bone.inverseBindMatrix; // get world inverse matrix		
		mtx.getInverse( mtx_inv ); // convert to world matrix				
		
		this.flipMatrix(mtx); // convert to three.js order
		
		if (bone.parentIndex > -1)
		{
			// to world
			
			mtx_inv.elements = sea.joint[bone.parentIndex].inverseBindMatrix;									
			mtx_loc.getInverse( mtx_inv );									
			
			this.flipMatrix(mtx_loc); // convert to three.js order
			
			// to local
			
			mtx_loc.getInverse( mtx_loc );									
			
			mtx.multiplyMatrices( mtx_loc, mtx );				
		}
		
		// mtx is local matrix
		
		pos.setFromMatrixPosition( mtx );
		quat.setFromRotationMatrix( mtx );				
		
		bones[i] = {
				name:bone.name,
				pos:[pos.x, pos.y, pos.z],				
				rotq:[quat.x, quat.y, quat.z, quat.w],
				parent:bone.parentIndex
			}		
	}
		
	sea.tag = bones;
}

//
//	Skeleton Local
//

THREE.SEA3D.prototype.readSkeletonLocal = function(sea) {	
	var bones = [];
	
	for (var i = 0; i < sea.joint.length; i++) {
		var bone = sea.joint[i];
		
		bones[i] = {
				name:bone.name,
				pos:[bone.x, bone.y, bone.z],				
				rotq:[bone.qx, bone.qy, bone.qz, bone.qw],
				parent:bone.parentIndex
			}
	}
	
	sea.tag = bones;
}

//
//	Joint Object
//

THREE.SEA3D.prototype.readJointObject = function(sea) {	
	var mesh = sea.target.tag,
		bone = mesh.skeleton.bones[sea.joint];
	
	this.joints = this.joints || [];
	this.joints.push( this.objects["jnt/" + sea.name] = sea.tag = bone );
	
}

//
//	Skeleton Animation
//

THREE.SEA3D.prototype.getSkeletonAnimation = function(sea, skl) {	
	if (sea.tag) return sea.tag;
	
	var animations = [],
		delta = sea.frameRate / 1000,
		scale = [1,1,1],
		mtx_inv = new THREE.Matrix4();
	
	for (var i = 0; i < sea.sequence.length; i++) {
		var seq = sea.sequence[i];
		
		var start = seq.start;
		var end = start + seq.count;		
		var ns = sea.name + "/" + seq.name;
		
		var animation = {
			name:ns,
			repeat:seq.repeat,
			fps:sea.frameRate,
			JIT:0,
			length:delta * (seq.count - 1),
			hierarchy:[]
		}
		
		var len = sea.pose[0].length;
		
		for (var j = 0; j < len; j++) {			
			var bone = skl.joint[j],
				node = {parent:bone.parentIndex, keys:[]},
				keys = node.keys,
				time = 0;
			
			for (var t = start; t < end; t++) {	
				var joint = sea.pose[t][j];
				
				var mtx_global = THREE.SEA3D.BUFFER2.makeRotationFromQuaternion(new THREE.Quaternion(joint.qx, joint.qy, joint.qz, joint.qw));
				mtx_global.setPosition(new THREE.Vector3(joint.x, joint.y, joint.z));						
				
				if (bone.parentIndex > -1)
				{
					// to global
					
					mtx_inv.elements = skl.joint[bone.parentIndex].inverseBindMatrix;						
															
					var mtx_rect = THREE.SEA3D.BUFFER3.getInverse( mtx_inv );
					
					mtx_global.multiplyMatrices( mtx_rect, mtx_global );	
					
					// convert to three.js matrix
					
					this.flipMatrix(mtx_global);
					
					// To Local
					
					mtx_rect.getInverse( mtx_inv );
					
					this.flipMatrix(mtx_rect); // flip parent inverse
					
					mtx_rect.getInverse( mtx_rect ); // reverse to normal direction
					
					mtx_global.multiplyMatrices( mtx_rect, mtx_global );
				}
				else
				{
					this.flipMatrix(mtx_global);
				}
				
				var posQ = THREE.SEA3D.VECBUF0.setFromMatrixPosition(mtx_global);
				var newQ = THREE.SEA3D.QUABUF0.setFromRotationMatrix(mtx_global);
				
				keys.push({
						time:time,								
						pos:[posQ.x, posQ.y, posQ.z],												
						rot:[newQ.x, newQ.y, newQ.z, newQ.w],											
						scl:scale
					});
				
				time += delta;
			}
			
			animation.hierarchy[j] = node;
		}
		
		animations.push( animation );
	}
	
	return sea.tag = animations;		
}

//
//	Morpher
//

THREE.SEA3D.prototype.getMorpher = function(sea, geo) {	
	var morphs = [],
		flip = this.config.flip ? -1 : 1;
	
	for(var i = 0; i < sea.node.length; i++) {
		var node = sea.node[i],
			vertex = [];
				
		var j = 0, k = 0;
		while(j < geo.vertex.length)
			vertex[k++] = new THREE.Vector3(
				(geo.vertex[j] + node.vertex[j++]), 
				geo.vertex[j] + node.vertex[j++], 
				(geo.vertex[j] + node.vertex[j++]) * flip
			);
		
		morphs[node.name] = i;
		morphs[i] = {
			name:node.name, 
			vertices:vertex			
		}
	}
	
	return morphs;
}

//
//	Events
//

THREE.SEA3D.Event = {
	LOAD_PROGRESS:"sea3d_progress",
	DOWNLOAD_PROGRESS:"sea3d_download",
	COMPLETE:"sea3d_complete",
	OBJECT_COMPLETE:"sea3d_object",
	ERROR:"sea3d_error"
}

THREE.SEA3D.prototype.onProgress = null;

THREE.SEA3D.prototype.onComplete = function( args ) {
	args.file = this.scope; args.type = THREE.SEA3D.Event.COMPLETE; 	
	args.file.dispatchEvent(args);
	//console.log("SEA3D:", args.message);
}

THREE.SEA3D.prototype.onLoadProgress = function( args ) {
	args.file = this.scope; args.type = THREE.SEA3D.Event.LOAD_PROGRESS;
	args.file.dispatchEvent(args);
	//console.log("SEA3D:", args.progress);	
	if (args.file.onProgress) args.file.onProgress( args );
}

THREE.SEA3D.prototype.onDownloadProgress = function( args ) {
	args.file = this.scope; args.type = THREE.SEA3D.Event.DOWNLOAD_PROGRESS;
	args.file.dispatchEvent(args);	
	//console.log("SEA3D:", args.progress);
	if (args.file.onProgress) args.file.onProgress( args );
}

THREE.SEA3D.prototype.onCompleteObject = function( args ) {
	args.file = this.scope; args.type = THREE.SEA3D.Event.OBJECT_COMPLETE;
	args.file.dispatchEvent(args);
	//console.log("SEA3D:", args.object.name + "." + args.object.type);
}

THREE.SEA3D.prototype.onError = function( args ) {
	args.file = this.scope; args.type = THREE.SEA3D.Event.ERROR;
	args.file.dispatchEvent(args);
	//console.log("SEA3D:", args.message);
}

//
//	Loader
//

THREE.SEA3D.prototype.load = function( url ) {			
	this.loadBytes();
	this.file.load(url);		
}

THREE.SEA3D.prototype.loadBytes = function( data ) {			
	this.file = new SEA3D.File( data );
	this.file.scope = this;
	this.file.onComplete = this.onComplete;
	this.file.onProgress = this.onLoadProgress;
	this.file.onCompleteObject = this.onCompleteObject;
	this.file.onDownloadProgress = this.onDownloadProgress;
	this.file.onError = this.onError;
	
	//	SEA3D
	
	switch(this.config.parser)
	{
		case THREE.SEA3D.AUTO: 
			this.file.typeRead[SEA3D.Geometry.prototype.type] = 
			this.file.typeRead[SEA3D.GeometryDelta.prototype.type] =
				this.readGeometrySwitch; 
			break;
			
		case THREE.SEA3D.BUFFER: 
			this.file.typeRead[SEA3D.Geometry.prototype.type] = 
			this.file.typeRead[SEA3D.GeometryDelta.prototype.type] = 
				this.readGeometryBuffer; 
			break;
			
		default: 
			this.file.typeRead[SEA3D.Geometry.prototype.type] = 
			this.file.typeRead[SEA3D.GeometryDelta.prototype.type] = 
				this.readGeometry; 			
			break;
	}	
	
	this.file.typeRead[SEA3D.Mesh.prototype.type] = this.readMesh;	
	this.file.typeRead[SEA3D.Mesh2D.prototype.type] = this.readMesh2D;	
	this.file.typeRead[SEA3D.Container3D.prototype.type] = this.readContainer3D;	
	this.file.typeRead[SEA3D.Dummy.prototype.type] = this.readDummy;	
	this.file.typeRead[SEA3D.Line.prototype.type] = this.readLine;	
	this.file.typeRead[SEA3D.Material.prototype.type] = this.readMaterial;
	this.file.typeRead[SEA3D.PointLight.prototype.type] = this.readPointLight;
	this.file.typeRead[SEA3D.DirectionalLight.prototype.type] = this.readDirectionalLight;
	this.file.typeRead[SEA3D.Camera.prototype.type] = this.readCamera;
	this.file.typeRead[SEA3D.Skeleton.prototype.type] = this.readSkeleton;		
	this.file.typeRead[SEA3D.SkeletonLocal.prototype.type] = this.readSkeletonLocal;	
	this.file.typeRead[SEA3D.JointObject.prototype.type] = this.readJointObject;
	this.file.typeRead[SEA3D.CubeMap.prototype.type] = this.readCubeMap;
	this.file.typeRead[SEA3D.CubeRender.prototype.type] = this.readCubeRender;	
	this.file.typeRead[SEA3D.Animation.prototype.type] = this.readAnimation;
	this.file.typeRead[SEA3D.SoundPoint.prototype.type] = this.readSoundPoint;	
	this.file.typeRead[SEA3D.TextureURL.prototype.type] = this.readTextureURL;	
	
	//	UNIVERSAL
	this.file.typeRead[SEA3D.JPEG.prototype.type] = this.readImage;		
	this.file.typeRead[SEA3D.JPEG_XR.prototype.type] = this.readImage;	
	this.file.typeRead[SEA3D.PNG.prototype.type] = this.readImage;	
	this.file.typeRead[SEA3D.GIF.prototype.type] = this.readImage;	
	this.file.typeRead[SEA3D.MP3.prototype.type] = this.readSound;	
	
	if (data) this.file.read();	
}