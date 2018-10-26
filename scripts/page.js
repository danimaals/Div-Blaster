////  Page-scoped globals  ////

// Counters
var rocketIdx = 1;
var asteroidIdx = 1;
var shieldIdx = 1;
var lives = 3;
var rocketsFired = 0;
var rocketsHit = 0;

// Size Constants
var MAX_ASTEROID_SIZE = 50;
var MIN_ASTEROID_SIZE = 15;
var ASTEROID_SPEED = 5;
var ROCKET_SPEED = 10;
var SHIP_SPEED = 25;
var OBJECT_REFRESH_RATE = 50;  //ms
var SCORE_UNIT = 100;  // scoring is in 100-point units

// Size vars
var maxShipPosX, maxShipPosY;

// Global Window Handles (gwh__)
var gwhGame, gwhOver, gwhStatus, gwhScore, gwhAccuracy, gwhSettings;

// Global Object Handles
var ship;

var KEYS = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  shift: 16,
  spacebar: 32
}

var state = {
  initial: true,
  running: false,
  over: false
}

var settings = {
  audio: false,
  spawnrate: 1
}

var settingsOpen = false;
var shielded = false;
var spawnIntervalId;

// Main
$(document).ready( function() {
  console.log("Ready!");

  // Set global handles (now that the page is loaded)
  gwhGame = $('.game-window');
  gwhOver = $('.game-over');
  gwhStatus = $('.status-window');
  gwhScore = $('#score-box');
  gwhAccuracy = $('#accuracy-box');
  ship = $('#enterprise');  // set the global ship handle
  gwhSettings = $('#settings-button');
  gwhSplash = $('.splash-screen');
  icon1 = $('#icon1');
  icon2 = $('#icon2');

  // Set global positions
  maxShipPosX = gwhGame.width() - ship.width();
  maxShipPosY = gwhGame.height() - ship.height();

  $(window).keydown(keydownRouter);
  $(window).click(clickHandler);
  $('#asteroid-spawnrate').focusout(checkValidSpawnrate);

  // Periodically check for collisions (instead of checking every position-update)
  setInterval( function() {
    checkCollisions();  // Remove elements if there are collisions
  }, 100);
});

function checkValidSpawnrate() {
  var enteredRate = $('#asteroid-spawnrate').val();
  if (enteredRate) {
    if ($.isNumeric(enteredRate)) {
      if (!(enteredRate >= 0.2 && enteredRate <= 4)) {
        alert('Please enter a numerical value that ranges from 0.2 to 4');
        return false;
      }
      return true;
    }
    else {
      alert('Please enter a numerical value that ranges from 0.2 to 4');
      return false;
    }
  }
}

function keydownRouter(e) {
  switch (e.which) {
    case KEYS.shift:
      createAsteroid();
      break;
    case KEYS.spacebar:
      fireRocket();
      break;
    case KEYS.left:
    case KEYS.right:
    case KEYS.up:
    case KEYS.down:
      moveShip(e.which);
      break;
    default:
      console.log("Invalid input!");
  }
}

// Check for any collisions and remove the appropriate object if needed
function checkCollisions() {
  // First, check for rocket-asteroid checkCollisions
  $('.rocket').each( function() {
    var curRocket = $(this);  // define a local handle for this rocket
    $('.asteroid').each( function() {
      var curAsteroid = $(this);  // define a local handle for this asteroid

      // For each rocket and asteroid, check for collisions
      if (isColliding(curRocket,curAsteroid)) {
        // If a rocket and asteroid collide, destroy both
        curRocket.remove();
        curAsteroid.remove();

        rocketsHit++;
        if (rocketsHit % 10 == 0) {
          createShield();
        }

        // Score points for hitting an asteroid! Smaller asteroid --> higher score
        var points = Math.ceil(MAX_ASTEROID_SIZE-curAsteroid.width()) * SCORE_UNIT;
        // Update the visible score
        gwhScore.html(parseInt($('#score-box').html()) + points);
        // Update the rocket accuracy
        gwhAccuracy.html(Math.floor((rocketsHit/rocketsFired)*100) + '%');
      }
    });
    $('.shield').each( function() {
      var curShield = $(this);
      if (isColliding(curRocket, curShield)) {
        curRocket.remove();
        curShield.remove();
      }
    });
  });

  // Next, check for asteroid-ship interactions
  $('.asteroid').each( function() {
    var curAsteroid = $(this);
    if (isColliding(curAsteroid, ship)) {
      //need to account for shield here too
      // Remove all game elements
      if (shielded) {
        $('#deployed-shield').hide();
        shielded = false;
        curAsteroid.remove();
      }
      else {
        console.log('collision!');
        handleSound('explode');
        $('#explosion').css('display', 'inline');
        setTimeout(function(){ $('#explosion').css('display', 'none'); }, 1000);
        if (lives === 0) {
          ship.remove();
          $('.rocket').remove();  // remove all rockets
          $('.asteroid').remove();  // remove all asteroids
          state.running = false;
          state.over = true;
          $('#final-score').html('Your Score: ' + gwhScore.html());

          // Show "Game Over" screen
          gwhOver.show();
          handleSound('gameover');
        }
        else {
          $('.rocket').remove();
          $('.asteroid').remove();
          $('.shield').remove();
          lives = lives - 1;
          if (lives === 2) {
            $('#icon2').css('display', 'none');
          }
          else {
            $('#icon1').css('display', 'none');
          }
        }
      } 
    }
  });

  $('.shield').each( function() {
    var curShield = $(this);
    if (isColliding(curShield, ship)) {
      $('#deployed-shield').css('display', 'inline-block');
      shielded = true;
      curShield.remove();
    }
  });
}

// Check if two objects are colliding
function isColliding(o1, o2) {
  // Define input direction mappings for easier referencing
  o1D = { 'left': parseInt(o1.css('left')),
          'right': parseInt(o1.css('left')) + o1.width(),
          'top': parseInt(o1.css('top')),
          'bottom': parseInt(o1.css('top')) + o1.height()
        };
  o2D = { 'left': parseInt(o2.css('left')),
          'right': parseInt(o2.css('left')) + o2.width(),
          'top': parseInt(o2.css('top')),
          'bottom': parseInt(o2.css('top')) + o1.height()
        };

  // If horizontally overlapping...
  if ( (o1D.left < o2D.left && o1D.right > o2D.left) ||
       (o1D.left < o2D.right && o1D.right > o2D.right) ||
       (o1D.left < o2D.right && o1D.right > o2D.left) ) {

    if ( (o1D.top > o2D.top && o1D.top < o2D.bottom) ||
         (o1D.top < o2D.top && o1D.top > o2D.bottom) ||
         (o1D.top > o2D.top && o1D.bottom < o2D.bottom) ) {

      // Collision!
      return true;
    }
  }
  return false;
}

// Return a string corresponding to a random HEX color code
function getRandomColor() {
  // Return a random color. Note that we don't check to make sure the color does not match the background
  return '#' + (Math.random()*0xFFFFFF<<0).toString(16);
}

// Handle asteroid creation events
function createAsteroid() {
  if (!state.running) {
    return;
  }
  console.log('Spawning asteroid...');

  // NOTE: source - http://www.clipartlord.com/wp-content/uploads/2016/04/aestroid.png
  var asteroidDivStr = "<div id='a-" + asteroidIdx + "' class='asteroid'></div>"
  // Add the rocket to the screen
  gwhGame.append(asteroidDivStr);
  // Create and asteroid handle based on newest index
  var curAsteroid = $('#a-'+asteroidIdx);

  asteroidIdx++;  // update the index to maintain uniqueness next time

  // Set size of the asteroid (semi-randomized)
  var astrSize = MIN_ASTEROID_SIZE + (Math.random() * (MAX_ASTEROID_SIZE - MIN_ASTEROID_SIZE));
  curAsteroid.css('width', astrSize+"px");
  curAsteroid.css('height', astrSize+"px");
  curAsteroid.append("<img src='img/asteroid.png' height='" + astrSize + "'/>")

  // Pick a random starting position within the game window
  var startingPosition = Math.random() * (gwhGame.width()-astrSize);  // Using 50px as the size of the asteroid (since no instance exists yet)

  // Set the instance-specific properties
  curAsteroid.css('left', startingPosition+"px");

  // Make the asteroids fall towards the bottom
  setInterval( function() {
    curAsteroid.css('top', parseInt(curAsteroid.css('top'))+ASTEROID_SPEED);
    // Check to see if the asteroid has left the game/viewing window
    if (parseInt(curAsteroid.css('top')) > (gwhGame.height() - curAsteroid.height())) {
      curAsteroid.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

function createShield() {
  if (!state.running) {
    return;
  }
  console.log('Spawning shield...');

  var shieldDivStr = "<div id='s-" + shieldIdx + "' class='shield'></div>"
  // Add the rocket to the screen
  gwhGame.append(shieldDivStr);
  // Create and asteroid handle based on newest index
  var curShield = $('#s-'+shieldIdx);

  shieldIdx++;  // update the index to maintain uniqueness next time

  curShield.css('width', "50px");
  curShield.css('height', "50px");
  curShield.append("<img src='img/shield.png' height='50px'/>")

  // Pick a random starting position within the game window
  var startingPosition = Math.random() * (gwhGame.width()-50);  // Using 50px as the size of the asteroid (since no instance exists yet)

  // Set the instance-specific properties
  curShield.css('left', startingPosition+"px");

  // Make the asteroids fall towards the bottom
  setInterval( function() {
    curShield.css('top', parseInt(curShield.css('top'))+ASTEROID_SPEED);
    // Check to see if the asteroid has left the game/viewing window
    if (parseInt(curShield.css('top')) > (gwhGame.height() - curShield.height())) {
      curShield.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

// Handle "fire" [rocket] events
function fireRocket() {
  if (!state.running) {
    return;
  }
  console.log('Firing rocket...');
  handleSound('rocket');
  // NOTE: source - https://www.raspberrypi.org/learning/microbit-game-controller/images/missile.png
  var rocketDivStr = "<div id='r-" + rocketIdx + "' class='rocket'><img src='img/rocket.png'/></div>";
  // Add the rocket to the screen
  gwhGame.append(rocketDivStr);
  // Create and rocket handle based on newest index
  var curRocket = $('#r-'+rocketIdx);
  rocketIdx++;  // update the index to maintain uniqueness next time
  rocketsFired++; // update the rocket accuracy
  gwhAccuracy.html(Math.floor((rocketsHit/rocketsFired)*100) + '%');

  // Set vertical position
  curRocket.css('top', ship.css('top'));
  // Set horizontal position
  var rxPos = parseInt(ship.css('left')) + (ship.width()/2);  // In order to center the rocket, shift by half the div size (recall: origin [0,0] is top-left of div)
  //var rxPos = parseInt(ship.css('left'));
  curRocket.css('left', rxPos-10+"px");

  // Create movement update handler
  setInterval( function() {
    curRocket.css('top', parseInt(curRocket.css('top'))-ROCKET_SPEED);
    // Check to see if the rocket has left the game/viewing window
    if (parseInt(curRocket.css('top')) < curRocket.height()) {
      //curRocket.hide();
      curRocket.remove();
    }
  }, OBJECT_REFRESH_RATE);
}

// Handle ship movement events
function moveShip(arrow) {
  switch (arrow) {
    case KEYS.left:  // left arrow
      var newPos = parseInt(ship.css('left'))-SHIP_SPEED;
      if (newPos < 0) {
        newPos = 0;
      }
      ship.css('left', newPos);
    break;
    case KEYS.right:  // right arrow
      var newPos = parseInt(ship.css('left'))+SHIP_SPEED;
      if (newPos > maxShipPosX) {
        newPos = maxShipPosX;
      }
      ship.css('left', newPos);
    break;
    case KEYS.up:  // up arrow
      var newPos = parseInt(ship.css('top'))-SHIP_SPEED;
      if (newPos < 0) {
        newPos = 0;
      }
      ship.css('top', newPos);
    break;
    case KEYS.down:  // down arrow
      var newPos = parseInt(ship.css('top'))+SHIP_SPEED;
      if (newPos > maxShipPosY) {
        newPos = maxShipPosY;
      }
      ship.css('top', newPos);
    break;
  }
}

function clickHandler(e) {
  var targetElt = e.target;
  switch($(targetElt).attr('id')) {
    case 'settings-button':
      //reveal settings panel if it's hidden
      if (!settingsOpen) {
        $('#settings-button').html('Close Settings Panel');
        $('.settings-panel').css('display', 'block');
        settingsOpen = true;
      }
      //else hide the open settings panel
      else {
        $('#settings-button').html('Open Settings Panel');
        $('.settings-panel').css('display', 'none');
        settingsOpen = false;
      }
    break;
    case 'update-settings':
      //update settings accordingly
      if ($('#asteroid-spawnrate').val()) {
        if ((checkValidSpawnrate())) {
          settings.spawnrate = $('#asteroid-spawnrate').val();
        }
        if (state.running) {
          handleAstSpawn();
        }
      }
      
      if ($("#audio-toggle").is(':checked')) {
        settings.audio = false;
      } else { settings.audio = true; }
      //hide the panel
      $('#settings-button').html('Open Settings Panel');
      $('.settings-panel').css('display', 'none');
      settingsOpen = false;
    break;
    case 'start-button':
      $('.splash-screen').css('display', 'none');
      $('#icon1').css('display', 'grid');
      $('#icon2').css('display', 'grid');
      state.running = true;
      handleAstSpawn();
    break;
    case 'go-back':
      //initialize ship/position, score, accuracy
      initializeGameState();
    break;
  }
}

function handleSound(sound) {
  if (settings.audio) {
    switch(sound) {
      case 'explode':
        $('#explodeSound').trigger('play');
      break;
      case 'gameover':
        $('#gameoverSound').trigger('play');
      break;
      case 'intro':
        $('#introSound').trigger('play');
      break;
      case 'rocket':
        $('#rocketSound').trigger('play');
      break;
    }
  }
}

function handleAstSpawn() {
  var rand = Math.random();
  var lowerBound = settings.spawnrate/2;
  var upperBound = settings.spawnrate*1.5;
  var newSpawnrate = lowerBound + rand*(upperBound - lowerBound);
  console.log('random in interval is ' + newSpawnrate);
  clearInterval(spawnIntervalId);
  spawnIntervalId = setInterval(function () {
    createAsteroid();
  }, (1000/newSpawnrate));
}

function initializeGameState() {
  gwhOver.hide();
  gwhGame.append(ship);
  ship.css('top', '555px');
  ship.css('left', '122px');
  gwhScore.html(0);
  gwhAccuracy.html('0%');
  gwhSplash.show();
  handleSound('intro');
  state.initial = true;
  state.over = false;
  lives = 3;
  rocketIdx = 1;
  asteroidIdx = 1;
  shieldIdx = 1;
  rocketsFired = 0;
  rocketsHit = 0;
  $('#explosion').hide();
}