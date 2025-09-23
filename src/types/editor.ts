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
};

export type UndoRedoState = Record<string, unknown>;