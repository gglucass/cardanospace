var headerSize = document.getElementById("header-container").offsetHeight;
var heightReduce = (headerSize+10);
SIZE = 400;
document.getElementById('space-container').style.height = window.innerHeight-heightReduce + "px";

var viewer = OpenSeadragon({
  id: "space-container",
  prefixUrl: "/openseadragon/images/",
  tileSources: window.location.pathname.includes("gif") ? "https://bucketeer-f6569a6d-c968-4a5b-b26d-078b14027920.s3.amazonaws.com/public/newspace.dzi?v=" + performance.now() : "https://bucketeer-f6569a6d-c968-4a5b-b26d-078b14027920.s3.amazonaws.com/public/space.dzi?v=" + performance.now(),
  // tileSources: "../space_creator/newspace.dzi",
  navigationControlAnchor: OpenSeadragon.ControlAnchor.BOTTOM_RIGHT,
  maxZoomPixelRatio: 8
});

$(document).ready(function(){
  $(document).mousemove(function(e){
     var cpos = { top: e.pageY - 20, left: e.pageX + 20 };
     $('#besideMouse').offset(cpos);
  });
});

viewer.addHandler('open', function() {
  SIZE = viewer.world.getItemAt(0).getContentSize()["x"] / 100;
  var tracker = new OpenSeadragon.MouseTracker({
    element: viewer.container,
    moveHandler: function(event) {
      setDestination(event.position);
    }
  });
  tracker.setTracking(true);
});

viewer.addHandler('canvas-click', function(event) {
  event.preventDefaultAction = true;
  if (event.quick) {
    setDestination(event.position);
    var destination = $('#canvasCursor').attr("href");
    let url = false
    try {
      url = new URL(destination);
    } catch {
      console.log('failed try');
    }
    if (url) {
      window.open(url);
    } else {
      console.log("no destination");
    }
  }
});

viewer.addHandler('zoom', function(event) {
  let arcCss = document.styleSheets[2].rules[0];
  let viewerZoom = viewer.viewport.getZoom(true);
  arcCss.style.borderWidth = 4 * viewerZoom + "px";
})

SQUARES_DATA = "https://bucketeer-f6569a6d-c968-4a5b-b26d-078b14027920.s3.amazonaws.com/public/destinations.zip";
DRAWINGS_DATA = "https://bucketeer-f6569a6d-c968-4a5b-b26d-078b14027920.s3.amazonaws.com/public/drawings.zip";
GIFS_DATA = "https://bucketeer-f6569a6d-c968-4a5b-b26d-078b14027920.s3.amazonaws.com/public/gifs.zip";
DESTINATIONS = {};
DRAWINGS = {};
GIFS = {};
GIFELEMS = {};
SONICELEMS = {};
IMGTRAITS = {};
SUPPORTED_TRAITS = ["Radiant", "Dynamic", "BlackHole", "Holographic", "Sonic", "TDRS"];
timeoutID = 1;

function getCoords(position) {
  var viewportPoint = viewer.viewport.pointFromPixel(position);
  var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
  var x = String(Math.floor(imagePoint.x / SIZE)).padStart(2, '0');
  var y = String(Math.floor(imagePoint.y / SIZE)).padStart(2, '0');
  return [x, y];
}

function setDestination(position, coordinateKey=null, x=0, y=0) {
  let coordinateKeyPresent = coordinateKey !== null;
  if (coordinateKey===null) {
    [x, y] = getCoords(position);
    coordinateKey = x + y;    
  }
  let coordinate = DESTINATIONS[coordinateKey];

  if (coordinate) {
    coordinateName = toLetter(x) +  (parseInt(y)+1);

    // show message and link to destination
    let img = coordinate.img.replace(/(^\w+:|^)\/\//, '');;
    let title = coordinateName + ": " + coordinate.msg;
    let uri = "https://" + coordinate.url.replace(/(^\w+:|^)\/\//, '');
    try {
      var url = new URL(uri);
    } catch {
      console.log('failed to create url for coordinate: ', coordinate.id);
    }
    if (!coordinateKeyPresent) {
      if (url) {
          $("#canvasCursor").attr("href", url);
          $("#canvasCursor").attr("target", "_blank");
      } else {
        $("#canvasCursor").attr("href", "");
      }
      if (title) {
        $("#besideMouse").html(title)  
        $("#besideMouse").css("display", "block");
      } else {
        $("#besideMouse").html("")
        $("#besideMouse").css("display", "none");
      }
    }

    let drawing = DRAWINGS[img]
    // activate traits
    if (drawing) {
      let traits = drawing.data.traits;
      let blackHolePresent = drawing.data.types.some(typ => typ.includes("black hole"))
      if (blackHolePresent) {
        traits.push("BlackHole");
      }
      window.drawing = drawing;
      window.coordinate = getCurrentCoordinate(x, y, drawing.coordinates);
      let coordinateKey = "" + window.coordinate.x_end + window.coordinate.y_start + window.coordinate.y_end;
      window.drawingClassName = drawing.data.image + "-" + coordinateKey;
      window.coordinateIDX = coordinate.idx;
      

      // resets all traits (maybe traits should turn themselves off?) (what happens if there's no drawing?)
      let radiantSquare = document.getElementById('squareRadiating');
      if (radiantSquare === null || radiantSquare.className !== drawingClassName) {
        try {
          viewer.removeOverlay("squareRadiating");
          radiantSquare.remove();  
        } catch {
        }
      }

      let blackHoleSquare = document.getElementById('squareBlackHole');
      if (blackHoleSquare.className !== drawingClassName) {
        try {
          blackHoleSquare.style.display = "none";
          blackHoleSquare.className = "";
          viewer.removeOverlay("squareBlackHole");
        } catch {
        }
      }

      let holographicSquare = document.getElementById('squareHolographic');
      if (holographicSquare.className !== drawingClassName) {
        try {
          holographicSquare.style.display = "none";
          holographicSquare.className = "";
          viewer.removeOverlay("squareHolographic");
        } catch {
        }
      }

      let tdrsSquare = document.getElementById('tdrsContainer');
      if (tdrsSquare.className !== drawingClassName) {
        try {
          if (position) {
            clearTimeout(timeoutID);
          }
          tdrsSquare.style.display = "none";
          tdrsSquare.className = "";
          viewer.removeOverlay("tdrsContainer");
        } catch {
        }
      }
      for (let trait in traits) {
        let traitName = traits[trait];
        try {
          if (SUPPORTED_TRAITS.includes(traitName)) {
            Function('"use strict"; return(activate' + traitName + '(coordinate, drawingClassName, drawing.data.image, coordinateIDX)' +')')();
          }  
        } catch {
          console.log("trait failed: ", traitName);
        }
      }
    }
  } else {
    $("#besideMouse").html("")
    $("#canvasCursor").attr("href", "");
    $("#besideMouse").css("display", "none");
  }
}

function getCurrentCoordinate(x, y, coordinates) {
  for (let coordKey in coordinates) {
    let coordinate = coordinates[coordKey];
    if (between(x, coordinate.x_start, coordinate.x_end) && between(y, coordinate.y_start, coordinate.y_end)) {
      return coordinate;
    }
  }
}

function activateRadiant(coordinate, className, image) {
  let radiantSquare = document.getElementById('squareRadiating');
  if (radiantSquare === null || radiantSquare.className !== className) {
    let elt = document.createElement("div");
    elt.id = "squareRadiating";
    elt.className = className;
    document.body.appendChild(elt);
    let new_point_small = new OpenSeadragon.Point((coordinate.x_start/100), (coordinate.y_start/100));
    let width = (coordinate.x_end - coordinate.x_start + 1) / 100;
    let height = (coordinate.y_end - coordinate.y_start + 1) / 100;
    let overlay = { 
      element: 'squareRadiating',
      width: width,
      height: height,
      location: new_point_small,
      rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
    };
    viewer.addOverlay(overlay, {location: new_point_small});
  }
}

function activateBlackHole(coordinate, className, image) {
  let blackHoleSquare = document.getElementById('squareBlackHole');
  if (blackHoleSquare.className !== className) {
    blackHoleSquare.className = className;
    blackHoleSquare.style.display = "block";
    let width = (coordinate.x_end - coordinate.x_start + 2) / 100 * 3;
    let height = (coordinate.y_end - coordinate.y_start + 2) / 100 * 3;
    let offsetWidth = (width / 3) + (1.5/3/100);
    let offsetHeight = (height / 3) + (1.5/3/100);
    let new_point_small = new OpenSeadragon.Point((coordinate.x_start/100) - offsetWidth, (coordinate.y_start/100) - offsetHeight);
    let overlay = { 
      element: 'squareBlackHole',
      width: width,
      height: height,
      location: new_point_small,
      rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
    };
    viewer.addOverlay(overlay, {location: new_point_small});
  }
}

function activateDynamic(coordinate, className, image) {
  try {
    let coordinateKey = "" + coordinate.x_end + coordinate.y_start + coordinate.y_end;
    if (!GIFELEMS[coordinateKey]) {
      addGif(DRAWINGS[image], coordinateKey, coordinate);
    }  
  } catch {
    console.log("coordinate has dynamic, but image is not a gif: ", image);
  } 
}

function activateSonic(coordinate, className, image) {
  try {
    let coordinateKey = "" + coordinate.x_end + coordinate.y_start + coordinate.y_end;
    if (!SONICELEMS[coordinateKey]) {
      if (DRAWINGS[image].data.audio) {
        playSonic(DRAWINGS[image], coordinateKey, coordinate);  
      } else {
        console.log("coordinate has sonic, but no sound defined for: ", image);
      }
    } else if (SONICELEMS[coordinateKey].paused) {
      if ($("#audioToggle")[0].getAttribute("audio") === "true") {
        SONICELEMS[coordinateKey].play();  
      }
    }
  } catch {
    console.log("coordinate has sonic, but no sound defined for: ", image);
  }

}

function activateHolographic(coordinate, className, image) {
  let holographicSquare = document.getElementById('squareHolographic');
  if (holographicSquare.className !== className) {
    holographicSquare.className = className;
    holographicSquare.style.display = "block";
    let width = (coordinate.x_end - coordinate.x_start + 1) / 100 * 2;
    let height = (coordinate.y_end - coordinate.y_start + 1) / 100 * 2;
    let offsetWidth = (width / 4);
    let offsetHeight = (height / 4);
    let new_point_small = new OpenSeadragon.Point((coordinate.x_start/100) - offsetWidth, (coordinate.y_start/100) - offsetHeight);
    let overlay = { 
      element: 'squareHolographic',
      width: width,
      height: height,
      location: new_point_small,
      rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
    };
    viewer.addOverlay(overlay, {location: new_point_small});
  }
}

function activateTDRS(coordinate, className, image, coordinateIDX) {

  let tdrsContainer = document.getElementById('tdrsContainer');
  if (DRAWINGS[image].data.tdrs !== null && tdrsContainer.className !== className) {

    var destinationCoordinate = DRAWINGS[image].data.tdrses[coordinateIDX].replace("-", "");
    // todo figure out what happens if you have an image in multiple places with different tdrs destinations
    // add a tdrs object to the DRAWINGS data, instead of a single value
    
    let [x, y] = toCoordinate(destinationCoordinate);
    let destinationCoordinateKey = "" + x + y;

    let destinationDrawingImg = DESTINATIONS[destinationCoordinateKey].img.replace("ipfs://", "")
    let destinationDrawing = DRAWINGS[destinationDrawingImg];
    let destinationDrawingCoordinate = getCurrentCoordinate(x, y, destinationDrawing.coordinates);
    let destinationDrawingClassName = destinationDrawing.data.image + "-" + destinationCoordinateKey;

    tdrsContainer.className = className;
    tdrsContainer.style.display = "block";
    let width = (coordinate.x_end - coordinate.x_start + 1) / 100 / 3;
    let height = (Math.abs(destinationDrawingCoordinate.y_end - coordinate.y_start)) / 100;
    let coordinateXAvg = (coordinate.x_start + coordinate.x_end+1)/2;
    let coordinateXDelta = (coordinate.x_end+1-coordinate.x_start)
    let destinationCoordinateXAvg = (destinationDrawingCoordinate.x_start + destinationDrawingCoordinate.x_end)/2;

    if (destinationDrawingCoordinate.x_start >= coordinate.x_start && destinationDrawingCoordinate.y_start <= coordinate.y_end ) {
      // tdrs destination to the right and above the originating squares
      let rectWidth = Math.max( (Math.abs(destinationDrawingCoordinate.x_start - coordinate.x_end-1)), 2) / 100;
      let rectHeight = Math.max((coordinate.y_start - destinationDrawingCoordinate.y_end -1), 2) / 100;
      let new_rect = new OpenSeadragon.Rect(((coordinate.x_end+1)/100), ((destinationDrawingCoordinate.y_end+1)/100), rectWidth, rectHeight, 0)
      let overlay = {
        element: 'tdrsContainer',
        location: new_rect,
        rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
      }
      viewer.addOverlay(overlay);
      document.getElementById("tdrsRect").style.transform = "scaleY(-1) scaleX(1)";
    } else if (destinationDrawingCoordinate.x_start <= coordinate.x_start && destinationDrawingCoordinate.y_start <= coordinate.y_end ) {
      // tdrs destination to the left and above the originating squares
      let rectWidth = Math.max((coordinate.x_start - destinationDrawingCoordinate.x_end - 1), 2) / 100;
      let rectHeight = Math.max((coordinate.y_start - destinationDrawingCoordinate.y_end -1), 2) / 100;
      let new_rect = new OpenSeadragon.Rect(((destinationDrawingCoordinate.x_end+1)/100), ((destinationDrawingCoordinate.y_end+1)/100), rectWidth, rectHeight, 0)
      let overlay = {
        element: 'tdrsContainer',
        location: new_rect,
        rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
      }
      viewer.addOverlay(overlay);
      document.getElementById("tdrsRect").style.transform = "scaleY(-1) scaleX(-1)";

    } else if (destinationDrawingCoordinate.x_start <= coordinate.x_start && destinationDrawingCoordinate.y_start >= coordinate.y_end ) {
      // tdrs destination to the left and below the originating squares
      let rectWidth = Math.max((coordinate.x_start - destinationDrawingCoordinate.x_end - 1), 2) / 100;
      let rectHeight = (destinationDrawingCoordinate.y_start - coordinate.y_end -1) / 100;
      let new_rect = new OpenSeadragon.Rect(((destinationDrawingCoordinate.x_end+1)/100), ((coordinate.y_end+1)/100), rectWidth, rectHeight, 0)
        let overlay = {
          element: 'tdrsContainer',
          location: new_rect,
          rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
        }
        viewer.addOverlay(overlay);
      document.getElementById("tdrsRect").style.transform = "scaleX(-1) scaleY(1)";
    } else if (destinationDrawingCoordinate.x_start >= coordinate.x_start && destinationDrawingCoordinate.y_start >= coordinate.y_end ) {
      // tdrs destination to the right and above the originating squares
      let rectWidth = Math.max((destinationDrawingCoordinate.x_start - coordinate.x_end - 1), 2) / 100;
      let rectHeight = (destinationDrawingCoordinate.y_start - coordinate.y_end -1) / 100;
      let new_rect = new OpenSeadragon.Rect(((coordinate.x_end+1)/100), ((coordinate.y_end+1)/100), rectWidth, rectHeight, 0)
        let overlay = {
          element: 'tdrsContainer',
          location: new_rect,
          rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
        }
        viewer.addOverlay(overlay);
      document.getElementById("tdrsRect").style.transform = "scaleX(1) scaleY(1)";
    } else {
      console.log("does not fall in any of the cases");
    }

    window.destination_x = x;
    window.destination_y = y;
    window.destinationCoordinateKey = destinationCoordinateKey;
    timeoutID = setTimeout(() => { setDestination(null, window.destinationCoordinateKey, window.destination_x, window.destination_y) }, 2500)
    
    
    // todo figure out what happens if you have an image in multiple places with different tdrs destinations
  }
}

$('#squareBorder').hide();
$('#squareEye').hide();
$('#squareOutline').hide();

viewer.world.resetItems();
viewer.imageLoader.clear();
viewer.world.update();
fetchDestinations();
fetchDrawings();
fetchGifs();




// gif related methods

function addGif(gifObject, gifKey, coordinate) {
  var mediaDiv = document.createElement("div");
  mediaDiv.style.position = "absolute";
  mediaDiv.style.pointerEvents = "none";
  mediaDiv.id = "key-" + gifKey;
  

  var gif = document.createElement("img");
  gif.src = (`https://cardanospace.mypinata.cloud/ipfs/${gifObject.data.image}`);
  gif.style.width = "100%";
  gif.style.height = "100%";
  gif.style.objectFit = "contain";
  gif.style.verticalAlign = "top";
  // gif.style.backgroundColor = "black";
  gif.addEventListener("load", function() {
    gif.style.backgroundColor = "black";
  })
  gif.classList.add("freezeframe");
  viewer.canvas.appendChild(mediaDiv);
  mediaDiv.appendChild(gif);
  let width = (coordinate['x_end'] - coordinate['x_start'] + 1) * SIZE;
  let height = (coordinate['y_end'] - coordinate['y_start'] + 1) * SIZE;
  const x = coordinate['x_start']*SIZE;
  const y = coordinate['y_start']*SIZE;

  const rect = new OpenSeadragon.Rect(x, y, width, height)
  const repositionElement = function() {
    const newRect = viewer.viewport.viewportToViewerElementRectangle(
      viewer.viewport.imageToViewportRectangle(rect)
    );
    
    mediaDiv.style.left = newRect.x + "px";
    mediaDiv.style.top = newRect.y + "px";
    mediaDiv.style.width = newRect.width + "px";
    mediaDiv.style.height = newRect.height + "px";
  }
  repositionElement();
  viewer.addHandler("open", repositionElement)
  viewer.addHandler("animation", repositionElement)
  viewer.addHandler("rotate", repositionElement)
  GIFELEMS[gifKey] = mediaDiv;
  setTimeout(() => { delete GIFELEMS[gifKey]; mediaDiv.remove(); }, 15000);
}


// TODO fix playrandomgifs
function playRandomGifs() {
  setTimeout(() => { let randGif = randomProperty(GIFS); activateDynamic(randGif, "abcd", randGif.image); playRandomGifs() }, 1000);
}


function playSonic(image, sonicKey, coordinate) {
  var audio = document.createElement("audio");

  $(audio).on("loadedmetadata", function(){
    audio.muted = false;
    var timeout = Math.min((2000 + (audio.duration * 2 * 1000)), 30000);
    setTimeout(() => { SONICELEMS[sonicKey].remove(); delete SONICELEMS[sonicKey]; }, timeout);
  });
  audio.id = "audio-" + sonicKey;
  audio.volume = 0.5;
  audio.muted = true;
  SONICELEMS[sonicKey] = audio;
  audio.src = (`https://cardanospace.mypinata.cloud/ipfs/${image.data.audio}`);
  document.body.appendChild(audio);
}

function toLetter(x_coordinate) {  
  let prefix = '';

  if (x_coordinate > 77) {
    prefix = 'C';
  } else if (x_coordinate > 51) {
    prefix = 'B';
  } else if (x_coordinate > 25) {
    prefix = 'A';
  } else {
    prefix = "";
  }
  let postfix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[(x_coordinate % 26)];

  return prefix+postfix
}

function toCoordinate(coordinateName) {
  let [xs, y] = coordinateName.split(/(\d+)\b/)
  let [x1, x2] = xs.split(/(\D)\b/)
  let x1p = alphabetPosition(x1);
  let x2p = alphabetPosition(x2);
  let xCord = 0
  if (x1p > 0) {
    if (x1p === 1) {
      xCord += 26;
    } else if (x1p === 2) {
      xCord += 52;
    } else if (x1p === 3) {
      xCord += 78;
    }
  }
  xCord += x2p;

  let x = String(xCord-1).padStart(2, '0');
      y = String(y-1).padStart(2, '0');

  return [x, y];
}

function alphabetPosition(char) {
  var result = 0;
  
  var code = char.toUpperCase().charCodeAt(0)
  if (code > 64 && code < 91) result += (code - 64);
  

  return result
}

// search

$("#search-coords").change(function() {
  let coordinate = this.value;
  if (coordinate.length > 1) {
    coordinate = coordinate.replace('-', '')
    let [x, y] = coordinate.split(/([0-9]+)/g)
    let y_coord = parseInt(y)-1;
    let x_coord = convertLettersToX(x.toUpperCase());
    let new_point_large = new OpenSeadragon.Point((x_coord/100)-0.02, (y_coord/100)-0.02)
    let new_point_small = new OpenSeadragon.Point((x_coord/100), (y_coord/100))
    let overlay1 = viewer.currentOverlays[0];
    overlay1.update(new_point_small);
    let overlay2 = viewer.currentOverlays[1];
    overlay2.update(new_point_large);
    let overlay3 = viewer.currentOverlays[2];
    overlay3.update(new_point_large);
    viewer.forceRedraw();
    $('#squareBorder').show();
    $('#squareEye').show();
    $('#squareOutline').show();
  } else {
    $('#squareBorder').hide();
    $('#squareEye').hide();
    $('#squareOutline').hide();
  }
})

viewer.overlays = [
{
  id: 'squareEye',
  x: 0,
  y: 0,
  width: 0.01,
  height: 0.01,
  rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
},
{
  id: 'squareBorder',
  x: 0,
  y: 0,
  width: 0.05,
  height: 0.05,
  rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
}, 
{
  id: 'squareOutline',
  x: 0,
  y: 0,
  width: 0.05,
  height: 0.05,
  rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
},
]


// fetch jsons which allow us to add dynamic content

function fetchDestinations() {
  JSZipUtils.getBinaryContent(SQUARES_DATA, function(err, data) {
    if(err) {
      throw err; // or handle err
      console.log("Status: " + err)
      return Promise.reject("server")
    }

    JSZip.loadAsync(data).then(function (zip) {
      zip.file("destinations.json").async("string").then(function (filedata) {
        DESTINATIONS = JSON.parse(filedata);
      });
    });
  });
}

function fetchDrawings() {
  JSZipUtils.getBinaryContent(DRAWINGS_DATA, function(err, data) {
    if(err) {
      throw err; // or handle err
      console.log("Status: " + err)
      return Promise.reject("server")
    }

    JSZip.loadAsync(data).then(function (zip) {
      zip.file("drawings.json").async("string").then(function (filedata) {
        DRAWINGS = JSON.parse(filedata);
      });
    });
  });
}

function fetchGifs() {
  JSZipUtils.getBinaryContent(GIFS_DATA, function(err, data) {
    if(err) {
      throw err; // or handle err
      console.log("Status: " + err)
      return Promise.reject("server")
    }

    JSZip.loadAsync(data).then(function (zip) {
      zip.file("gifs.json").async("string").then(function (filedata) {
        GIFS = JSON.parse(filedata);
        playRandomGifs();
      });
    });
  });
}


// helpers

function between(x, min, max) {
  return x >= min && x <= max;
}

var randomProperty = function (obj) {  
  var keys = Object.keys(obj);
  return obj[keys[ keys.length * Math.random() << 0]];
};

function convertLettersToX(x_letters) {
  let x_coord = 0;
  let alphabet = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
  if (x_letters.length === 1) {
    x_coord = x_coord + alphabet.indexOf(x_letters[0])
  } else if (x_letters.length === 2) {
    switch(x_letters[0]) {
      case "A":
        x_coord = x_coord + 26;
        break;
      case "B":
        x_coord = x_coord + 52;
        break;
      case "C":
        x_coord = x_coord + 78;
        break;
    }
    x_coord = x_coord + alphabet.indexOf(x_letters[1])
  }
  return x_coord
}


$("#audioToggle").click(function(e) {
  if (e.target.getAttribute("audio") === 'true') {
    e.target.setAttribute("audio", "false");
    e.target.innerText = '🔇'
    var audios = document.getElementsByTagName("AUDIO");
    $("audio").each(function(){
      this.pause();
    })
  } else {
    e.target.setAttribute("audio", "true");
    e.target.innerText = '🔊'
  }
})

$(document).click(function(e) {
  if ($("#audioToggle")[0].getAttribute("initiated") === 'false') {
    $("#audioToggle")[0].setAttribute("audio", "true");
    $("#audioToggle")[0].setAttribute("initiated", "true");
    $("#audioToggle")[0].innerText = '🔊'
  }
})