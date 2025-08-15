export type Point = { x: number; y: number };

export type TextItem = {
  // add fields you use (selected, color, font, etc.)
  boxPadding: number;
  fontSize: number;
  index: number;
  text: string;
  x: number;
  y: number;
};

export type ImageItem = {
  data:string;
  height:number;
  index:number;
  width:number;
  x:number;
  y:number;
};

export type Page = {
  textItems: TextItem[];
  imageItems: ImageItem[];
};

export type UndoRedoState = Record<string, unknown>;