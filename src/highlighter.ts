import * as vscode from "vscode"
import { log } from "util"

function simpleHashString(str: string): string {
  //return str;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();// + str;      // as decimal string (e.g., "-123456789")
  // or: return Math.abs(hash).toString(16); // as hex string (e.g., "7f9b7a5")
}

//TODO add options
class DecoratorClass {
  private decorationVarList: {
    [id: string]: vscode.TextEditorDecorationType | undefined
  } = {};

  private config = vscode.workspace.getConfiguration("rainbow-highlighter");

  private buildColor = (color: string) => {
    const putAlpha = (c: string) => {
      const colorVal = c.match(/\((.+)\)/)![1]
      return `rgba(${colorVal}, ${this.config["background-alpha"]})`
    }
    return {
      backgroundColor: this.config["use-border"] ? undefined : putAlpha(color),
      border: this.config["use-border"] ? `2px solid ${color}` : undefined,
      overviewRulerColor: color
    }
  };

  private colorPalette: ((
    varName: string
  ) => vscode.TextEditorDecorationType)[] = vscode.workspace
    .getConfiguration("rainbow-highlighter")
  ["palette"].map((color: string) => {
    //    let varName = simpleHashString(varName);
    return (varName: string) => {
      const decoration = vscode.window.createTextEditorDecorationType(
        this.buildColor(color)
      )
      //     this.decorationVarList[simpleHashString(varName)] = decoration
      this.decorationVarList[varName] = decoration
      return decoration
    }
  });

  public getNewColor = (usedColors: number[] = []) => {
    const colors = [...Array(this.colorPalette.length).keys()]
    const unusedColors = colors.filter(i => usedColors.indexOf(i) < 0)
    if (unusedColors.length > 0) {
      return unusedColors[0]
    }
    return colors[~~(Math.random() * colors.length)]
  };

  public DecoratorClass() { }

  public removeHighlight(editors: readonly vscode.TextEditor[], key: string) {
    const decoration = this.decorationVarList[simpleHashString(key)]
    if (decoration) {
      editors.forEach(e => e.setDecorations(decoration, []))
    }
  }

  public clearVariable(key: string) {
    this.decorationVarList[key] = undefined
  }

  public removeHighlights(editors: readonly vscode.TextEditor[]) {
    Object.keys(this.decorationVarList)
      .map(k => this.decorationVarList[k])
      .filter(d => d)
      .forEach(d =>
        editors.forEach(e => e.setDecorations(d!, []))
      )
    this.decorationVarList = {}
  }
  public highlightRange(
    editor: vscode.TextEditor,
    range: vscode.Range[],
    key: string,
    colorIndex: number
  ) {
    const hashed_key = simpleHashString(key);
    let decoration = this.decorationVarList[hashed_key]

    try {
      if (decoration === undefined) { //} || key === 'toString') {
        decoration = this.colorPalette[colorIndex](hashed_key)
      }
      editor.setDecorations(decoration, range)
    } catch {
      // When key === 'toString', there will be an exception and the word will not be highlighted
      decoration = vscode.window.createTextEditorDecorationType({
        //        backgroundColor: "red", // Pick something extreme!
        backgroundColor: "#8F87F1", // Pick something extreme!
        border: "2px solid lime",
        color: "white"
      });

      //      const decoration = this.colorPalette[colorIndex](hashed_key)

      this.decorationVarList[hashed_key] = decoration;

      //decoration = this.colorPalette[colorIndex](key)
      editor.setDecorations(decoration, range)
    }
  }
}

//use with Decorator.getInstance(); This will return decorator singleton.
export var Decorator = (function () {
  let instance: DecoratorClass
  function createInstance() {
    return new DecoratorClass()
  }
  return {
    getInstance() {
      if (!instance) {
        instance = createInstance()
      }
      return instance
    }
  }
})()
