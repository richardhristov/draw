import $ from 'jquery';
import { saveAs, } from 'file-saver';

import { updateCanvas, clearCanvas, } from './draw';
import * as SHAPES from './shapes';

// Globals
let $canvas;
let canvasClickEnd = null;
let canvasClickStart = null;
let shapes = [];
let shapesForeground = [];
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
  tool.MouseDown(canvasClickStart);
}

function canvasMouseUp(e) {
  canvasClickEnd = null;
  canvasClickStart = null;
  tool.MouseUp(canvasClickStart);
}

function canvasMouseMove(e) {
  if (!canvasClickEnd || !canvasClickStart) {
    return;
  }

  canvasClickEnd = getCursorPosition(e, $canvas[0]);
  tool.MouseMove(canvasClickEnd, canvasClickStart);
}

// Tools
const toolLine = {
  type: 'line',
  MouseDown: (xy) => null,
  MouseUp: (xy) => shapes.push(shapesForeground[0]),
  MouseMove: (xy, startXy) => {
    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_LINE,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      points: [
        canvasClickStart,
        canvasClickEnd,
      ],
    });
  },
};

const toolRectangle = {
  type: 'rectangle',
  MouseDown: (xy) => null,
  MouseUp: (xy) => shapes.push(shapesForeground[0]),
  MouseMove: (xy, startXy) => {
    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_PATH,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      fillColor: options.fillColor,
      points: [
        [Math.min(xy[0], startXy[0]), Math.min(xy[1], startXy[1]),],
        [Math.max(xy[0], startXy[0]), Math.min(xy[1], startXy[1]),],
        [Math.max(xy[0], startXy[0]), Math.max(xy[1], startXy[1]),],
        [Math.min(xy[0], startXy[0]), Math.max(xy[1], startXy[1]),],
      ],
    });
  },
};

const toolCircle = {
  type: 'circle',
  MouseDown: (xy) => null,
  MouseUp: (xy) => shapes.push(shapesForeground[0]),
  MouseMove: (xy, startXy) => {
    const radius = Math.max(
      Math.abs(xy[0] - startXy[0]),
      Math.abs(xy[1] - startXy[1])
    );
    const centerX = radius / 2 + Math.min(xy[0], startXy[0]);
    const centerY = radius / 2 + Math.min(xy[1], startXy[1]);

    shapesForeground = [];
    shapesForeground.push({
      ...SHAPES.SHAPE_CIRCLE,
      strokeColor: options.strokeColor,
      strokeWidth: options.strokeWidth,
      fillColor: options.fillColor,
      radius,
      points: [
        [centerX, centerY,]
      ],
    });
  },
};

const toolEllipse = {
  type: 'ellipse',
  MouseDown: (xy) => null,
  MouseUp: (xy) => shapes.push(shapesForeground[0]),
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

const tools = [
  toolLine,
  toolRectangle,
  toolCircle,
  toolEllipse,
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
  $('.js-btn-tool.selected').removeClass('selected');
  $el.addClass('selected');
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
});

// New button event listener
$(document).on('click', '.js-btn-new', function(e) {
  if (shapes.length > 0 && !confirm('All changes will be lost, are you sure?')) {
    e.preventDefault();
    return;
  }
  shapes = [];
  shapesForeground = [];
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

  // Bind mouse listeners
  $canvas.mousedown(canvasMouseDown);
  $canvas.mouseup(canvasMouseUp);
  $canvas.mousemove(canvasMouseMove);

  try {
    if(window.localStorage) {
      // Restore from localstorage
      shapes = JSON.parse(window.localStorage.getItem('canvas')) || [];
      shapesForeground = [];

      // Save to localstorage every second
      setInterval(function() {
        window.localStorage.setItem('canvas', JSON.stringify(shapes));
      }, 1000);
    }
  } catch(err) {}

  // Refresh the page at 144hz
  setInterval(refreshCanvas, 1000 / 144);
});
