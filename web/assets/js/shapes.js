const SHAPE_BASE = {
  fillColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 5,
  alpha: 1,
  groupId: null,
};

export const SHAPE_LINE = {
  ...SHAPE_BASE,
  type: 'line',
  fillColor: null,
};

export const SHAPE_PATH = {
  ...SHAPE_BASE,
  type: 'path',
};

export const SHAPE_CIRCLE = {
  ...SHAPE_BASE,
  type: 'ellipse',
  angle: 0,
};

export const SHAPE_ELLIPSE = {
  ...SHAPE_BASE,
  type: 'ellipse',
  angle: 0,
};
