declare var navigationDocument: {
  documents: Document[];
  removeDocument(document: Document): void;
  pushDocument(document: Document): void;
  replaceDocument(src: Document, dest: Document): void;
  presentModal(document: Document): void;
  clear(): void;
  popToDocument(document: Document): void;
  popDocument(): void;
  dismissModal(): void;
};

declare function getActiveDocument(): Document;
declare const App: any;

interface Document {
  getElementsByTagName(tag: "menuBar"): HTMLCollectionOf<MenuBarElement>;
  createElement(name: "menuItem"): MenuItem;
}

interface MenuBarElement extends Element {
  getFeature(feature: string): MenuBarDocument;
}

interface MenuItem extends Element {
  page(): Promise<any>;
  pageDoc: unknown;
}

interface MenuBarDocument extends Element {
  setDocument(document: Document, menuItem: MenuItem): void;
  setSelectedItem(menuItem: MenuItem): void;
}
