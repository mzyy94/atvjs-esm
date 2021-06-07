declare var navigationDocument;
declare function getActiveDocument(): Document;
declare const App;

interface Document {
  getElementsByTagName(tag: "menuBar"): HTMLCollectionOf<MenuBarElement>;
}

interface MenuBarElement extends Element {
  getFeature(feature: string): MenuBarDocument;
}

interface MenuItem {}
interface MenuBarDocument extends Element {
  setDocument(document: Document, menuItem: MenuItem): void;
  setSelectedItem(menuItem: MenuItem): void;
}
