
import * as vscode from 'vscode';

function getFullDocRange(document: vscode.TextDocument): vscode.Range {
	return document.validateRange(
		new vscode.Range(
			new vscode.Position(0, 0),
			new vscode.Position(Number.MAX_VALUE, Number.MAX_VALUE)
		)
	);
}

function insertNewline(state: any, token: string) {
	if (!state.newLine) {
		state.formattedDocument += "\n";
		return state;
	}

	state.newLine = false;

	return state;
}

function formatOpenList(state: any, token: string) {
	const charIsEscaped = state.escaped;
	if (charIsEscaped) {
		state.escaped = false;
	}

	const charIsInString = !state.string
	if (charIsInString) {
		const isOnNewLine = !state.newLine;
		if (isOnNewLine) {
			insertNewline(state, token);
		}

		state.formattedDocument += " ".repeat(4).repeat(state.openLists) + token;
		state.openLists++;
		state.array = true;
	} else {
		state.formattedDocument += token;
	}

	return state;
}

function formatCloseList(state: any, token: string) {
	const charIsEscaped = state.escaped;
	if (charIsEscaped) {
		state.escaped = false;
	}

	const charIsInString = !state.string
	if (charIsInString) {
		state.formattedDocument += token;
		state.openLists--;
	}

	return state;
}

function formatNewLine(state: any, token: string) {
	state.newLine = true;
	state.comment = false;
	state.array = false;
	state.formattedDocument += token;

	return state;
}

function formatWhitespace(state: any, token: string) {
	const charIsInsideACommentStringOrArray = state.comment || state.string || state.array
	if (charIsInsideACommentStringOrArray) {
		state.formattedDocument += token;
	}

	return state;
}

function formatComment(state: any, token: string) {
	const charIsEscaped = state.escaped;
	const charIsInString = state.string;
	if (charIsEscaped) {
		state.escaped = false;
	} else if (charIsInString) {
		state.comment = true;
	}

	state.formattedDocument += token;

	return state;
}

function escapeFormatter(state: any, token: string) {
	state.escaped = !state.escaped;
	state.formattedDocument += token;

	return state;
}

function stringFormatter(state: any, token: string) {
	const charIsEscaped = state.escaped;
	if (charIsEscaped) {
		state.escaped = false;
	} else {
		state.string = !state.string;
	}

	state.formattedDocument += token;

	return state;
}

export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerDocumentFormattingEditProvider('lisp', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {

			let state = {
				document: document.getText(),
				formattedDocument: "",
				openLists: 0,
				comment: false,
				escaped: false,
				string: false,
				newLine: false,
				array: false
			}

			let formatters: any = {
				"(": formatOpenList,
				")": formatCloseList,
				"\r": formatNewLine,
				"\n": formatNewLine,
				" ": formatWhitespace,
				"\t": formatWhitespace,
				";": formatComment,
				"\\": escapeFormatter,
				"\"": stringFormatter
			}

			for (var i = 0; i < state.document.length; i++) {
				const cursor = state.document.charAt(i)
				const formatter = formatters[cursor];

				if (formatter) {
					state = formatter(state, cursor);
				} else {
					state.formattedDocument += cursor;
					state.newLine = false;
					if (state.escaped) {
						state.escaped = false;
					}
				}
			}

			return [vscode.TextEdit.replace(getFullDocRange(document), state.formattedDocument)];
		}
	});
}
