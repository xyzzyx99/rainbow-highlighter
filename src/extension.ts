import * as vscode from "vscode"
import { Decorator } from "./highlighter"
import { getVarRangeList } from "./utils"
import { log } from "util"

interface ColorMap {
  [key: string]: number
}

function getTotalDecoratedInstances(
  highlightList: string[]
): number {
  let total = 0;
  //  const editors = vscode.window.visibleTextEditors;

  /*  for (const editor of editors) {
     for (const word of highlightList) {
       const ranges = getVarRangeList(editor, word);
       total += ranges.length;
     }
   }
  */
  vscode.window.visibleTextEditors.forEach(editor => {
    highlightList.forEach(word => {
      const ranges = getVarRangeList(editor, word);
      total += ranges.length;
    });
  });

  return total;
}

export function activate(context: vscode.ExtensionContext) {
  let highlightList: string[] = []
  let colorMap: ColorMap = {}
  const decorator = Decorator.getInstance()
  //let totalHighlights = 0

  const highlightOn = (editors: readonly vscode.TextEditor[], variable: string) => {
    // let old_length = highlightList.length;


    if (highlightList.indexOf(variable) < 0) {
      highlightList.push(variable)
    }
    editors.forEach(editor => {
      const rangeList = getVarRangeList(editor, variable)
      if (!(variable in colorMap)) {
        colorMap[variable] = decorator.getNewColor(Object.values(colorMap))
      }
      decorator.highlightRange(
        editor,
        rangeList,
        variable,
        colorMap[variable]
      )
    })

    // let new_length = highlightList.length;
    // let added = new_length - old_length;

    // let info = (1 === added) ? " highlight" : " highlights";

    // decorator.removeHighlight(editors, variable)

    // vscode.window.showInformationMessage(added + info + " added.");
  }

  const highlightOff = (editors: readonly vscode.TextEditor[], variable: string) => {

    // let old_length = highlightList.length;
    highlightList = highlightList.filter(x => x !== variable)
    // let new_length = highlightList.length;
    // let removed = old_length - new_length;

    // let info = (1 === removed) ? " highlight" : " highlights";

    decorator.removeHighlight(editors, variable)

    // vscode.window.showInformationMessage(removed + info + " removed.");
  }

  const toggleHighlight = () => {

    let old_length = getTotalDecoratedInstances(highlightList);

    const currentEditor = vscode.window.activeTextEditor
    if (!currentEditor) {
      return
    }
    const selection = currentEditor.selection
    //const regex = /[\d\w_]+/;
    const regex = undefined
    const range = currentEditor.document.getWordRangeAtPosition(
      selection.anchor,
      regex
    )
    if (!range) {
      return
    }
    const selectedText = currentEditor.document.getText(range)
    const turnOff = highlightList.indexOf(selectedText) > -1

    const editors = vscode.window.visibleTextEditors
    if (turnOff) {
      highlightOff(editors, selectedText)
    } else {
      highlightOn(editors, selectedText)
    }
    if (turnOff) {
      delete colorMap[selectedText]
      decorator.clearVariable(selectedText)
    }

    let new_length = getTotalDecoratedInstances(highlightList);
    let diff = new_length - old_length;

    let info1 = (1 === Math.abs(diff)) ? " highlight" : " highlights";

    let info2 = (diff > 0) ? " added" : " removed";

    vscode.window.showInformationMessage(Math.abs(diff) + info1 + info2 + " for current file. (There may be occurrences in other windows that can't be counted.)");
  }

  const removeAllHighlight = () => {
    let removed = getTotalDecoratedInstances(highlightList);

    highlightList = []
    colorMap = {}
    const editors = vscode.window.visibleTextEditors
    decorator.removeHighlights(editors);

    let info = (1 === removed) ? " highlight" : " highlights";

    //vscode.window.showInformationMessage(removed + info + " removed.");
    vscode.window.showInformationMessage(removed + info + " removed for current file. (There may be occurrences in other windows that can't be counted.)");
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "rainbow-highlighter.toggleHighlight",
      toggleHighlight
    )
  )

  const renewHighlight = (editors: readonly vscode.TextEditor[]) => {
    editors.forEach(editor => {
      highlightList.forEach(text => {
        const rangeList = getVarRangeList(editor, text)
        const color = colorMap[text]
        decorator.highlightRange(
          editor,
          rangeList,
          text,
          color
        )
      })
    })
  }

  const updateHighlight = (event: vscode.TextDocumentChangeEvent) => {
    const editors = vscode.window.visibleTextEditors
      .filter(editor => editor.document === event.document)

    highlightList.forEach(v => {
      decorator.removeHighlight(editors, v)
      highlightOn(editors, v)
    })
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "rainbow-highlighter.removeHighlight",
      removeAllHighlight
    )
  )

  const highlightLine = () => {

    let old_length = getTotalDecoratedInstances(highlightList);

    const currentEditor = vscode.window.activeTextEditor
    if (!currentEditor) {
      return
    }
    const selection = currentEditor.selection
    const range = currentEditor.document.getWordRangeAtPosition(
      selection.anchor,
      /.+/
    )
    if (!range) {
      return
    }
    const selectedText = [
      ...currentEditor.document.getText(range)
        .matchAll(/[\d\w_]+/g)
    ]
    selectedText
      .map(match => match.toString())
      .filter(word => Object.keys(colorMap).indexOf(word) < 0)
      .forEach(word => highlightOn(vscode.window.visibleTextEditors, word))

    let new_length = getTotalDecoratedInstances(highlightList);
    let diff = new_length - old_length;

    let info1 = (1 === Math.abs(diff)) ? " highlight" : " highlights";

    let info2 = (diff > 0) ? " added." : " removed.";

    vscode.window.showInformationMessage(Math.abs(diff) + info1 + info2);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "rainbow-highlighter.highlight-line",
      highlightLine
    )
  )

  vscode.window.onDidChangeVisibleTextEditors(
    renewHighlight,
    null,
    context.subscriptions
  )

  vscode.workspace.onDidChangeTextDocument(updateHighlight)
}

export function deactivate() { }
