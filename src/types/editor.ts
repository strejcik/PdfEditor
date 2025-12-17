export type Point = { x: number; y: number };

export type TextItem = {
  // add fields you use (selected, color, font, etc.)
  boxPadding: number;
  fontSize: number;
  index: number;
  text: string;
  x: number;
  y: number;
  anchor: string;
  xNorm: number;
  yNormTop: number;
  color: string,
};

export type ImageItem = {
  data:string;
  height:number;
  index:number;
  width:number;
  xNorm: number;
  yNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
  x:number;
  y:number;
};

export type Page = {
  textItems: TextItem[];
  imageItems: ImageItem[];
  shapes?: any[];
};

export type UndoRedoState = Record<string, unknown>;

export type TextBox = {
  rawText?: string;
  text?: string;
  width: number;
  height: number;
  boxPadding?: number;
  hasScaled?: boolean;
  baseFontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
  resizeBaseFontSize?: number;
  resizeBaseWidth?: number;
  resizeBaseHeight?: number;
  baseWidth?: number;
  baseHeight?: number;
  x?: number;
  y?: number;
  fontSize?: number;
};