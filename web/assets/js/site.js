import $ from 'jquery';
import { saveAs, } from 'file-saver';

import { updateCanvas, clearCanvas, } from './draw';
import * as SHAPES from './shapes';

// Globals
let $canvas;
let canvasClickEnd = null;
let canvasClickStart = null;
let canvasClickLast = null;
let shapes = [];
let shapesForeground = [];
let shapesSelected = [];
const options = {
  fillColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 5,
};

// Canvas mouse events
function getCursorPosition(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return [x, y];
}

function canvasMouseDown(e) {
  canvasClickEnd = getCursorPosition(e, $canvas[0]);
  canvasClickStart = canvasClickEnd;
  canvasClickLast = canvasClickEnd;
  tool.MouseDown(canvasClickStart);
}

function canvasMouseUp(e) {
  tool.MouseUp(canvasClickEnd, canvasClickStart);
  canvasClickEnd = null;
  canvasClickStart = null;
  canvasClickLast = null;
}

function canvasMouseMove(e) {
  if (!canvasClickEnd || !canvasClickStart) {
    return;
  }

  canvasClickEnd = getCursorPosition(e, $canvas[0]);
  tool.MouseMove(canvasClickEnd, canvasClickStart, canvasClickLast);
  canvasClickLast = canvasClickEnd;
}

function rotatePoint(p, origin, angle) {
  p[0] = p[0] - origin[0];
  p[1] = p[1] - origin[1];
  p[0] = (p[0] * Math.cos(angle)) - (p[1] * Math.sin(angle)); 
  p[1] = (p[1] * Math.cos(angle)) + (p[0] * Math.sin(angle));
  p[0] = p[0] + origin[0];
  p[1] = p[1] + origin[1];
  return p;
}

function pointsForRectangle(xy, startXy) {
  return [
    [Math.min(xy[0], startXy[0]), Math.min(xy[1], startXy[1]),],
    [Math.max(xy[0], startXy[0]), Math.min(xy[1], startXy[1]),],
    [Math.max(xy[0], startXy[0]), Math.max(xy[1], startXy[1]),],
    [Math.min(xy[0], startXy[0]), Math.max(xy[1], startXy[1]),],
  ];
}

function pointsForEllipse(c, radiusX, radiusY, angle = 0) {
  const angle90 = angle + Math.PI / 2;

  const ux = radiusX / 2 * Math.cos(angle);
  const uy = radiusX / 2 * Math.sin(angle);
  const vx = radiusY / 2 * Math.cos(angle90);
  const vy = radiusY / 2 * Math.sin(angle90);

  const width = Math.sqrt(ux * ux + vx * vx) * 2;
  const height = Math.sqrt(uy * uy + vy * vy) * 2;
  const x = c[0] - (width / 2);
  const y = c[1] - (height / 2);

  return pointsForRectangle([x+width, y+height,], [x, y,]);
}

function shapeIsIn(shape, points) {
  if (!shape) {
    return false;
  }
  if (points.length !== 4) {
    alert('Error, not implemented!');
    return;
  }
  let shapePoints = shape.points;
  if (shape.type === 'ellipse') {
    const c = shape.points[0];
    shapePoints = pointsForEllipse(c, shape.radiusX, shape.radiusY, shape.angle);
  }
  for (var i = 0; i < shapePoints.length; i++) {
    const [x, y] = shapePoints[i];
    if(x < points[0][0] || y < points[0][1] || x > points[1][0] || y > points[2][1]) {
      return false;
    }
  }
  return true;
}

function refreshSelection() {
  const shapesNormalized = shapesSelected.map(s => {
    if (s.type === 'ellipse') {
      return {
        ...s,
        points: pointsForEllipse(s.points[0], s.radiusX, s.radiusY, s.angle),
      };
    }
    return s;
  });
  const xy1 = [
    Math.min.apply(null, shapesNormalized.flatMap(s => s.points.map(p => -s.strokeWidth + p[0]))),
    Math.min.apply(null, shapesNormalized.flatMap(s => s.points.map(p => -s.strokeWidth + p[1]))),
  ];
  const xy2 = [
    Math.max.apply(null, shapesNormalized.flatMap(s => s.points.map(p => s.strokeWidth + p[0]))),
    Math.max.apply(null, shapesNormalized.flatMap(s => s.points.map(p => s.strokeWidth + p[1]))),
  ];
  shapesForeground = [];
  shapesForeground.push({
    ...SHAPES.SHAPE_PATH,
    strokeColor: '#333333',
    strokeWidth: 1,
    strokeDash: 4,
    fillColor: null,
    points: pointsForRectangle(xy1, xy2),
  });
}

// Tools
const toolLine = {
  type: 'line',
  MouseDown: (xy) => null,
  MouseUp: (xy, startXy) => {
    shapes.push(shapesForeground[0]);
    shapesForeground = [];
  },
  MouseMove: (xy, startXy) => {
    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_LINE,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      points: [
        startXy,
        xy,
      ],
    });
  },
};

const toolRectangle = {
  type: 'rectangle',
  MouseDown: (xy) => null,
  MouseUp: (xy, startXy) => {
    shapes.push(shapesForeground[0]);
    shapesForeground = [];
  },
  MouseMove: (xy, startXy) => {
    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_PATH,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      fillColor: options.fillColor,
      points: pointsForRectangle(xy, startXy),
    });
  },
};

const toolCircle = {
  type: 'circle',
  MouseDown: (xy) => null,
  MouseUp: (xy, startXy) => {
    shapes.push(shapesForeground[0]);
    shapesForeground = [];
  },
  MouseMove: (xy, startXy) => {
    const radiusX = Math.max(
      Math.abs(xy[0] - startXy[0]),
      Math.abs(xy[1] - startXy[1])
    );
    const radiusY = radiusX;
    const centerX = radiusX / 2 + Math.min(xy[0], startXy[0]);
    const centerY = radiusX / 2 + Math.min(xy[1], startXy[1]);

    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_CIRCLE,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      fillColor: options.fillColor,
      radiusX,
      radiusY,
      points: [
        [centerX, centerY,]
      ],
    });
  },
};

const toolEllipse = {
  type: 'ellipse',
  MouseDown: (xy) => null,
  MouseUp: (xy, startXy) => {
    shapes.push(shapesForeground[0]);
    shapesForeground = [];
  },
  MouseMove: (xy, startXy) => {
    const radiusX = Math.abs(xy[0] - startXy[0]);
    const radiusY = Math.abs(xy[1] - startXy[1]);
    const centerX = radiusX / 2 + Math.min(xy[0], startXy[0]);
    const centerY = radiusY / 2 + Math.min(xy[1], startXy[1]);

    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_ELLIPSE,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      fillColor: options.fillColor,
      radiusX,
      radiusY,
      points: [
        [centerX, centerY,]
      ],
    });
  },
};

const toolSelect = {
  type: 'select',
  MouseDown: (xy) => null,
  MouseUp: (xy, startXy) => {
    const points = pointsForRectangle(xy, startXy);
    shapesSelected = shapes.filter(s => shapeIsIn(s, points));
    refreshSelection();
    if (!shapesSelected.length) {
      return;
    }
    $('.js-input-option[data-option="strokeColor"]').val(shapesSelected[0].strokeColor);
    $('.js-input-option[data-option="fillColor"]').val(shapesSelected[0].fillColor);
    $('.js-input-option[data-option="strokeWidth"]').val(shapesSelected[0].strokeWidth);
  },
  MouseMove: (xy, startXy) => {
    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_PATH,
      strokeColor: '#333333',
      strokeWidth: 1,
      strokeDash: 4,
      fillColor: null,
      points: pointsForRectangle(xy, startXy),
    });
  },
};

const toolMove = {
  type: 'move',
  MouseDown: (xy) => null,
  MouseUp: (xy, startXy) => null,
  MouseMove: (xy, startXy, lastXy) => {
    const diffX = xy[0] - lastXy[0];
    const diffY = xy[1] - lastXy[1];
    shapesSelected.forEach(s => s.points.forEach(p => {
      p[0] = p[0] + diffX;
      p[1] = p[1] + diffY;
    }));
    refreshSelection();
  },
};

let rotateOrigin = null;
let rotateUpdating = false;
const toolRotate = {
  type: 'rotate',
  MouseDown: (xy) => {
    if (!shapesSelected.length || !shapesForeground.length) {
      return;
    }
    const cWidth = shapesForeground[0].points[1][0] - shapesForeground[0].points[0][0];
    const cHeight = shapesForeground[0].points[2][1] - shapesForeground[0].points[1][1];
    rotateOrigin = [
      shapesForeground[0].points[0][0] + (cWidth / 2),
      shapesForeground[0].points[0][0] + (cHeight / 2),
    ];
  },
  MouseUp: (xy, startXy) => {
    rotateOrigin = null;
    refreshSelection();
  },
  MouseMove: (xy, startXy, lastXy) => {
    if (!shapesSelected.length || !shapesForeground.length) {
      return;
    }
    if (rotateUpdating) {
      return;
    }
    rotateUpdating = true;
    const lastAngle = Math.atan2(lastXy[0] - rotateOrigin[0], lastXy[1] - rotateOrigin[1]);
    const currentAngle = Math.atan2(xy[0] - rotateOrigin[0], xy[1] - rotateOrigin[1]);
    let angle = lastAngle - currentAngle;

    angle = Math.min(angle, 0.001);
    angle = Math.max(angle, -0.001);

    shapesSelected.forEach(s => s.points.map(p => {
      p = rotatePoint(p, rotateOrigin, angle);
      if (s.type === 'ellipse') {
        s.angle = s.angle + angle;
      }
    }));
    shapesForeground.forEach(s => s.points.map(p => {
      p = rotatePoint(p, rotateOrigin, angle);
      if (s.type === 'ellipse') {
        s.angle = s.angle + angle;
      }
    }));
    rotateUpdating = false;
  },
};

let scaleXMin = null;
let scaleXMax = null;
let scaleYMin = null;
let scaleYMax = null;
let scaleWidth = null;
let scaleHeight = null;
let scaleOrigin = null;
let scaleDirection = null;
const toolScale = {
  type: 'scale',
  MouseDown: (xy) => {
    if (!shapesSelected.length || !shapesForeground.length) {
      return;
    }
    scaleXMin = Math.min.apply(null, shapesForeground[0].points.map(p => p[0]));
    scaleXMax = Math.max.apply(null, shapesForeground[0].points.map(p => p[0]));
    scaleYMin = Math.min.apply(null, shapesForeground[0].points.map(p => p[1]));
    scaleYMax = Math.max.apply(null, shapesForeground[0].points.map(p => p[1]));
    scaleWidth = scaleXMax - scaleXMin;
    scaleHeight = scaleYMax - scaleYMin;
    scaleOrigin = [
      (scaleWidth / 2) + scaleXMin,
      (scaleHeight / 2) + scaleYMin,
    ];
    const xDist = Math.abs(xy[0] - scaleOrigin[0]);
    const yDist = Math.abs(xy[1] - scaleOrigin[1]);
    if (xDist > yDist) {
      scaleDirection = xy[0] > scaleOrigin[0] ? 'right' : 'left';
    } else {
      scaleDirection = xy[1] > scaleOrigin[1] ? 'down' : 'up';
    }
  },
  MouseUp: (xy, startXy) => {
    scaleXMin = null;
    scaleXMax = null;
    scaleYMin = null;
    scaleYMax = null;
    scaleWidth = null;
    scaleHeight = null;
    scaleOrigin = null;
    scaleDirection = null;
  },
  MouseMove: (xy, startXy, lastXy) => {
    if (!shapesSelected.length || !shapesForeground.length) {
      return;
    }
    const xDelta = xy[0] - lastXy[0];
    const yDelta = xy[1] - lastXy[1];
    const xFactor = 1 + (xDelta / scaleWidth / 2);
    const yFactor = 1 + (yDelta / scaleHeight / 2);

    shapesSelected.forEach(s => s.points.forEach(p => {
      if (scaleDirection === 'right' || scaleDirection === 'left') {
        p[0] = p[0] - scaleOrigin[0];
        p[0] = p[0] * xFactor;
        p[0] = p[0] + scaleOrigin[0];
      }
      if (scaleDirection === 'down' || scaleDirection === 'up') {
        p[1] = p[1] - scaleOrigin[1];
        p[1] = p[1] * yFactor;
        p[1] = p[1] + scaleOrigin[1];
      }
    }));
    shapesSelected.forEach(s => {
      if (s.type === 'ellipse') {
        if (scaleDirection === 'right' || scaleDirection === 'left') {
          s.radiusX = s.radiusX * xFactor;
        }
        if (scaleDirection === 'down' || scaleDirection === 'up') {
          s.radiusY = s.radiusY * yFactor;
        }
      }
    });
    refreshSelection();
  },
};

const tools = [
  toolLine,
  toolRectangle,
  toolCircle,
  toolEllipse,
  toolSelect,
  toolMove,
  toolRotate,
  toolScale,
];
// Set the initial tool to line
let tool = toolLine;

// Clear the canvas and redraw all shapes
function refreshCanvas() {
  clearCanvas($canvas[0]);
  updateCanvas($canvas[0], shapes);
  updateCanvas($canvas[0], shapesForeground);
}

// Tool event listener
$(document).on('click', '.js-btn-tool', function() {
  const $el = $(this);

  const t = $el.data('tool');
  const tt = tools.find(ttt => ttt.type === t);
  if (!tt) {
    alert('Error, tool is not implemented!');
    return;
  }

  tool = tt;
  //shapesSelected = [];
  //shapesForeground = [];
  $('.js-btn-tool.selected').removeClass('selected');
  $el.addClass('selected');
});

// Delete button event listener
$(document).on('click', '.js-btn-delete', function() {
  shapes = shapes.filter(s => shapesSelected.indexOf(s) === -1);
  shapesSelected = [];
  shapesForeground = [];
});

// Duplicate button event listener
$(document).on('click', '.js-btn-duplicate', function() {
  const duplicates = shapesSelected.forEach(s => {
    const newS = JSON.parse(JSON.stringify(s));
    newS.points.forEach(p => {
      p[0] += 10;
      p[1] += 10;
    });
    shapes.push(newS);
  });
  shapesSelected = [];
  shapesForeground = [];
});

// To front button event listener
$(document).on('click', '.js-btn-to-front', function() {
  shapes = shapes.filter(s => shapesSelected.indexOf(s) === -1);
  shapes = [
    ...shapes,
    ...shapesSelected,
  ];
  shapesSelected = [];
  shapesForeground = [];
});

// To back button event listener
$(document).on('click', '.js-btn-to-back', function() {
  shapes = shapes.filter(s => shapesSelected.indexOf(s) === -1);
  shapes = [
    ...shapesSelected,
    ...shapes,
  ];
  shapesSelected = [];
  shapesForeground = [];
});

// Options inputs event listener
$(document).on('change', '.js-input-option', function(e) {
  const $el = $(this);

  const o = $el.data('option');
  if (!options[o]) {
    e.preventDefault();
    alert('Error, option is not supported!');
    return;
  }

  options[o] = $el.val();
  shapesSelected.forEach(s => s[o] = options[o]);
  refreshSelection();
});

// New button event listener
$(document).on('click', '.js-btn-new', function(e) {
  if (shapes.length > 0 && !confirm('All changes will be lost, are you sure?')) {
    e.preventDefault();
    return;
  }
  shapes = [];
  shapesForeground = [];
  shapesSelected = [];
});

// Save button event listener
$(document).on('click', '.js-btn-save', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }

  let $download = $('#js-download');
  if (!$download.length) {
    $download = $('<a id="js-download" style="display:none;"></a>');
    $download.appendTo(document.body);
  }

  const data = new Blob([JSON.stringify(shapes),], {type: 'text/plain;charset=utf-8',});
  const filename = 'draw.json';
  saveAs(data, filename);
});

// Load button event listeners
$(document).on('click', '.js-btn-load', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }

  $('#js-input-load').val('').click();
});
$(document).on('input', '#js-input-load', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }

  const files = e.target.files;
  console.log(files);

  if (!files.length) {
    alert('Error, no file selected!');
    e.preventDefault();
    return;
  }

  var reader = new FileReader();
  reader.onload = e => {
    try {
      console.log(e.target);
      shapes = JSON.parse(e.target.result);
      shapesForeground = [];
    } catch(err) {
      alert('Error, the file is invalid!');
    }
  };

  reader.readAsText(files[0]);
});

// About button event listener
$(document).on('click', '.js-btn-about', function(e) {
  window.alert('This is a project intended to demonstrate the author\'s skills in creating a computer graphics app.');
});

// Export to png button event listener
$(document).on('click', '.js-btn-png', function(e) {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('Error, your browser does not support loading and saving!');
    e.preventDefault();
    return;
  }
  shapesSelected = [];
  shapesForeground = [];
  refreshCanvas();

  let $download = $('#js-download');
  if (!$download.length) {
    $download = $('<a id="js-download" style="display:none;"></a>');
    $download.appendTo(document.body);
  }

  $canvas[0].toBlob(data => {
    const filename = 'draw.png';
    saveAs(data, filename);
  });
});

function resizeCanvas() {
  $canvas.attr('width', Math.floor($('#js-canvas-container').innerWidth()) - 10);
  $canvas.attr('height', Math.floor($('#js-canvas-container').innerHeight()) - 10);
}

$(window).resize(function() {
  resizeCanvas();
});

// Initialization event listener
$(document).ready(function() {
  $canvas = $('#js-canvas');
  if (!$canvas.length) {
    alert('Error, could not get canvas!');
    return;
  }
  if (!$canvas[0].getContext) {
    alert('Error, canvas is not supported!');
    return;
  }
  resizeCanvas();

  // Bind mouse listeners
  $canvas.mousedown(canvasMouseDown);
  $canvas.mouseup(canvasMouseUp);
  $canvas.mousemove(canvasMouseMove);

  try {
    if(window.localStorage) {
      // Restore from localstorage
      shapes = JSON.parse(window.localStorage.getItem('canvas')) || [];
      shapesForeground = [];
      shapesSelected = [];

      // Save to localstorage at 2hz
      setInterval(function() {
        window.localStorage.setItem('canvas', JSON.stringify(shapes));
      }, 1000 / 2);
    }
  } catch(err) {}

  // Refresh the page at 60hz
  setInterval(refreshCanvas, 1000 / 60);
});
