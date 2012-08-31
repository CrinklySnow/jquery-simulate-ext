/*jslint white: true vars: true browser: true todo: true */
/*jshint camelcase:true, plusplus:true, forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, devel:true, maxerr:100, white:false, onevar:false */
/*global noty:true jQuery:true $:true sprintf:true Roundizzle:true */

/* jQuery Simulate Drag-n-Drop Plugin 1.0
 * http://github.com/j-ulrich/jquery-simulate-ext
 * 
 * Copyright (c) 2012 Jochen Ulrich
 * Licensed under the MIT license (MIT-LICENSE.txt).
 */


;(function($, undefined) {
	"use strict";
	
	// Based on the findCenter function from jquery.simulate.js
	function findCenter( elem ) {
		var offset,
			jDocument = $( elem.ownerDocument );
		elem = $( elem );
		if (elem[0] === document) {
			offset = {left: 0, top: 0}; 
		}
		else {
			offset = elem.offset();
		}
			
		return {
			x: offset.left + elem.outerWidth() / 2 - jDocument.scrollLeft(),
			y: offset.top + elem.outerHeight() / 2 - jDocument.scrollTop()
		};
	}
	
	function interpolatedEvents(target, start, drag, options) {
		var self = this;
		var dragDistance = Math.sqrt(Math.pow(drag.x,2) + Math.pow(drag.y,2)); // sqrt(a^2 + b^2)
		var stepLength, stepCount, stepVector;
		
		if (options.stepLength) {
			stepLength = options.stepLength;
			stepCount = Math.floor(dragDistance / stepLength)-1;
			var stepScale = stepLength / dragDistance;
			stepVector = {x: drag.x*stepScale, y: drag.y*stepScale };
		}
		else {
			stepCount = options.stepCount;
			stepLength = Math.round(dragDistance / (stepCount+1));
			stepVector = {x: Math.round(drag.x/(stepCount+1)), y: Math.round(drag.y/(stepCount+1))};
		}
		
		var coords = $.extend({},start);
		
		function interpolationStep() {
			coords.x += stepVector.x;
			coords.y += stepVector.y;
			var effectiveCoords = {x: coords.x, y: coords.y};
			if (options.shaky) {
				var amplitude = (typeof options.shaky === "number")? options.shaky : 3;
				effectiveCoords.x += Math.floor(Math.random()*(2*amplitude+1)-amplitude);
				effectiveCoords.y += Math.floor(Math.random()*(2*amplitude+1)-amplitude);
			}
			self.simulateEvent( target, "mousemove", {clientX: effectiveCoords.x, clientY: effectiveCoords.y});	
		}
		
		
		function stepAndSleep() {
			var timeElapsed = now() - lastTime; // Work-around for Firefox "bug": setTimeout can fire before the timeout
			if (timeElapsed >= stepDelay) {
				if (i < stepCount) {
					interpolationStep();
					i += 1;
					setTimeout(stepAndSleep, stepDelay);
				}
				else {
					self.simulateEvent( target, "mousemove", {clientX: start.x+drag.x, clientY: start.y+drag.y});
				}
			}
			else {
				setTimeout(stepAndSleep, stepDelay - timeElapsed);
			}

		}

		if (!options.stepDelay && !options.duration) {
			// Trigger as fast as possible
			for (var i=0; i < stepCount; i+=1) {
				interpolationStep();
			}
			self.simulateEvent( target, "mousemove", {clientX: start.x+drag.x, clientY: start.y+drag.y});
		}
		else {
			var stepDelay = options.stepDelay || Math.round(options.duration / (stepCount+1));
			var i = 0;
			var now = Date.now || function() { return new Date().getTime() },
				lastTime = now();

			setTimeout(stepAndSleep, stepDelay);
		}
		
	}

	$.extend( $.simulate.prototype, {
		
		simulateDrag: function() {
			var target = this.target,
				options = this.options || {},
				center = findCenter( target ),
				x = Math.floor( center.x ),
				y = Math.floor( center.y ), 
				dx = Math.floor( options.dx || 0 ),
				dy = Math.floor( options.dy || 0 ),
				coord = { clientX: x, clientY: y };
			
			if ($.simulate.activeDrag && $.simulate.activeDrag.dragElement === target) {
				// We just continue to move the dragged element
				$.simulate.activeDrag.dragDistance.x += dx;
				$.simulate.activeDrag.dragDistance.y += dy;				
			}
			else {
				// We start a new drag
				this.simulateEvent( target, "mousedown", coord );
				$.extend($.simulate, {
					activeDrag: {
						dragElement: target,
						dragStart: { x: x, y: y },
						dragDistance: { x: dx, y: dy }
					}
				});
				$(target).add(document).one('mouseup', function() {
					$.simulate.activeDrag = undefined;
				});
			}

			if (dx !== 0 || dy !== 0) {
				coord = { clientX: x + dx, clientY: y + dy };
				if (options.interpolation) {
					interpolatedEvents.apply(this, [target, {x: x, y: y}, {x: dx, y: dy}, options.interpolation]);
				}
				else {
					this.simulateEvent( target, "mousemove", coord );
				}
			}
		},
		
		/**
		 * Simulates a drop.
		 * 
		 * The position where the drop occurs is determined in the following way:
		 * 1.) If there is an active drag with a distance dx != 0 and dy != 0, the drop occurs
		 * at the end position of that drag.
		 * 2.) If there is no active drag or the distance of the active drag is 0 (i.e. dx == 0 and
		 * dy == 0), then the drop occurs at the center of the target given to the drop. In this case,
		 * the mouse is moved onto the center of the target before the drop is simulated.
		 * In both cases, an active drag will be ended.
		 */
		simulateDrop: function() {
			var target = this.target,
				activeDrag = $.simulate.activeDrag,
				options = this.options || {},
				center = findCenter( target ),
				x = Math.floor( center.x ),
				y = Math.floor( center.y ),
				coord = { clientX: x, clientY: y };
			
			if (activeDrag && (activeDrag.dragDistance.x !== 0 || activeDrag.dragDistance.y !== 0)) {
				// We already moved the mouse during the drag so we just simulate the drop on the end position
				x = activeDrag.dragStart.x + activeDrag.dragDistance.x;
				y = activeDrag.dragStart.y + activeDrag.dragDistance.y;
				coord = { clientX: x, clientY: y };
			}
			else {
				// Else we assume the drop should happen on target, so we move there
				this.simulateEvent( target, "mousemove", coord );
			}
			
			this.simulateEvent( target, "mouseup", coord );
			this.simulateEvent( target, "click", coord );
			$.simulate.activeDrag = undefined;
		},
		
		simulateDragNDrop: function() {
			var target = this.target,
				options = this.options || {},
				dropTarget = options.dropTarget || target,
				dx = (options.dropTarget)? 0 : (options.dx || 0),
				dy = (options.dropTarget)? 0 : (options.dy || 0),
				dragDistance = { dx: dx, dy: dy };
			
			$(target).simulate( "drag", dragDistance );
			$(dropTarget).simulate( "drop" );
		}
	});
	
}(jQuery));