/* global define, require, module */

/**
 * Outlayer Item
 */

( function( window ) {

'use strict';


// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

// -------------------------- Outlayer definition -------------------------- //

function outlayerItemDefinition( EventEmitter, getSize, TweenMax ) {


// -------------------------- Item -------------------------- //

function Item( element, layout ) {
  if ( !element ) {
    return;
  }

  this.element = element;
  // parent layout class, i.e. Masonry, Isotope, or Packery
  this.layout = layout;
  this.position = {
    x: 0,
    y: 0
  };

  this._create();
}

// inherit EventEmitter
extend( Item.prototype, EventEmitter.prototype );

Item.prototype._create = function() {
  // transition objects
  this._transn = {
    ingProperties: {},
    clean: {},
    onEnd: {}
  };

  this.css({
    position: 'absolute'
  });
};

// trigger specified handler for event type
Item.prototype.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

Item.prototype.getSize = function() {
  this.size = getSize( this.element );
};

/**
 * apply CSS styles to element
 * @param {Object} style
 */
Item.prototype.css = function( style ) {
  TweenMax.set(this.element, style);
};

 // measure position, and sets it
Item.prototype.getPosition = function() {
  var layoutOptions = this.layout.options;
  var isOriginLeft = layoutOptions.isOriginLeft;
  var isOriginTop = layoutOptions.isOriginTop;

  var x = this.element._gsTransform.x;
  var y = this.element._gsTransform.y;

  // clean up 'auto' or other non-integer values
  x = isNaN( x ) ? 0 : x;
  y = isNaN( y ) ? 0 : y;

  // remove padding from measurement
  var layoutSize = this.layout.size;
  x -= isOriginLeft ? layoutSize.paddingLeft : layoutSize.paddingRight;
  y -= isOriginTop ? layoutSize.paddingTop : layoutSize.paddingBottom;

  this.position.x = x;
  this.position.y = y;
};

// set settled position, apply padding
Item.prototype.layoutPosition = function() {
  var layoutSize = this.layout.size;
  var layoutOptions = this.layout.options;
  var style = {};

  if ( layoutOptions.isOriginLeft )
    style.x = layoutSize.paddingLeft;
  else
    style.x = layoutSize.paddingRight;
  style.x += this.position.x;

  if ( layoutOptions.isOriginTop )
    style.y = layoutSize.paddingTop;
  else
    style.y = layoutSize.paddingBottom;
  style.y += this.position.y;

  style.z = 0;
  style.transformPerspective = 600;

  this.css(style);
  this.emitEvent( 'layout', [ this ] );
};

Item.prototype._transitionTo = function( x, y ) {
  this.getPosition();

  var compareX = parseInt( x, 10 );
  var compareY = parseInt( y, 10 );
  var didNotMove = compareX === this.position.x && compareY === this.position.y;

  // if did not move and not transitioning, just go to layout
  if ( didNotMove && !this.isTransitioning ) {
    this.layoutPosition();
    return;
  }

  var animation = {
    to: {
      'x': x,
      'y': y,
      'force3D': true,
      'onComplete': function(){
        // save end position
        this.setPosition( x, y );
        this.layoutPosition();
        this.emitEvent( 'transitionEnd', [ this ] );
      }.bind(this)
    }
  };

  this.transition(animation);
};

// non transition + transform support
Item.prototype.goTo = function( x, y ) {
  this.setPosition( x, y );
  this.layoutPosition();
};

Item.prototype.moveTo = Item.prototype._transitionTo;

Item.prototype.setPosition = function( x, y ) {
  this.position.x = parseInt( x, 10 );
  this.position.y = parseInt( y, 10 );
};

// ----- transition ----- //

/**
 * @param {Object} style - CSS
 * @param {Function} onTransitionEnd
 */

// non transition, just trigger callback
Item.prototype._nonTransition = function( args ) {
  this.css( args.to );
  args.to.onComplete();
};

/**
 * proper transition
 * @param {Object} args - arguments
 *   @param {Object} to - style to transition to
 *   @param {Object} from - style to start transition from
 */
Item.prototype._transition = function( args ) {
  var duration = parseFloat( this.layout.options.transitionDuration );
  // redirect to nonTransition if no transition duration
  if ( !duration ) {
    this._nonTransition( args );
    return;
  }

  if (args.from)
    TweenMax.fromTo(
      this.element,
      duration,
      args.from,
      args.to
    );
  else
    TweenMax.to(
      this.element,
      duration,
      args.to
    );
};

Item.prototype.transition = Item.prototype._transition;

// ----- show/hide/remove ----- //

// remove element from DOM
Item.prototype.removeElem = function() {
  this.element.parentNode.removeChild( this.element );
  this.emitEvent( 'remove', [ this ] );
};

Item.prototype.remove = function() {
  // just remove element if no transition support or no transition
  if ( !parseFloat( this.layout.options.transitionDuration ) ) {
    this.removeElem();
    return;
  }

  // start transition
  var _this = this;
  this.on( 'transitionEnd', function() {
    _this.removeElem();
    return true; // bind once
  });
  this.hide();
};

Item.prototype.reveal = function() {
  delete this.isHidden;
  // remove display: none
  this.css({ display: '' });

  var options = this.layout.options;
  var toOption = options.visibleStyle;

  toOption.onComplete = function() {
    this.emitEvent('transitionEnd', [this]);
  }.bind(this);

  this.transition({
    from: options.hiddenStyle,
    to: toOption,
  });
};

Item.prototype.hide = function() {
  // set flag
  this.isHidden = true;
  // remove display: none
  this.css({ display: '' });

  var options = this.layout.options;
  var toOption = options.hiddenStyle;

  toOption.onComplete = function() {
    // check if still hidden
    // during transition, item may have been un-hidden
    if ( this.isHidden )
      this.css({ display: 'none' });
    this.emitEvent('transitionEnd', [this]);
  }.bind(this);

  this.transition({
    from: options.visibleStyle,
    to: toOption
  });
};

Item.prototype.destroy = function() {
  this.css({
    position: '',
    left: '',
    right: '',
    top: '',
    bottom: '',
    transition: '',
    transform: ''
  });
};

return Item;

}

// -------------------------- transport -------------------------- //

if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( [
      'eventEmitter/EventEmitter',
      'get-size/get-size',
      'TweenMax'
    ],
    outlayerItemDefinition );
} else if (typeof exports === 'object') {
  // CommonJS
  module.exports = outlayerItemDefinition(
    require('wolfy87-eventemitter'),
    require('get-size'),
    require('gsap')
  );
} else {
  // browser global
  window.Outlayer = {};
  window.Outlayer.Item = outlayerItemDefinition(
    window.EventEmitter,
    window.getSize,
    window.TweenMax
  );
}

})( window );
