function drawLine(canvas, el) {
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.moveTo(el.points[0][0], el.points[0][1]);
  ctx.lineTo(el.points[1][0], el.points[1][1]);

  return ctx;
}

function drawPath(canvas, el) {
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.moveTo(el.points[0][0], el.points[0][1]);
  for (let i = 1; i < el.points.length; i++) {
    ctx.lineTo(el.points[i][0], el.points[i][1]);
  }
  ctx.lineTo(el.points[0][0], el.points[0][1]);

  return ctx;
}

function drawEllipse(canvas, el) {
  const ctx = canvas.getContext('2d');

  let radiusX = el.radiusX ? el.radiusX : el.radius;
  let radiusY = el.radiusY ? el.radiusY : el.radius;

  ctx.moveTo(el.points[0][0], el.points[0][1]);
  ctx.beginPath();
  ctx.ellipse(el.points[0][0], el.points[0][1], radiusX / 2, radiusY / 2, 0, 0, 2 * Math.PI);

  return ctx;
}

function drawShape(canvas, el) {
  let ctx;
  switch (el.type) {
    case 'line':
      ctx = drawLine(canvas, el);
      break;
    case 'path':
      ctx = drawPath(canvas, el);
      break;
    case 'ellipse':
      ctx = drawEllipse(canvas, el);
      break;
  }

  if (el.strokeColor !== null) {
    ctx.lineWidth = el.strokeWidth;
    ctx.strokeStyle = el.strokeColor;
    ctx.stroke();
  }
  if (el.fillColor !== null) {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }
}

export function updateCanvas(canvas, shapes) {
  shapes.forEach(el => drawShape(canvas, el));
}

export function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
