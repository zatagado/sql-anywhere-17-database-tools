# SQL Anywhere 17 Database Tools

Browse tables, views, and procedures over **ODBC**, run SQL from the editor, and view results in a side panel.

## Prerequisites

- **ODBC Data Sources**
- **SQL Anywhere 17 ODBC Driver**

## Installation

1. Download the `.vsix` file.
2. In **VS Code** or **Cursor**, install the extension using either method:
   - Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Extensions: Install from VSIX…**, then select the `.vsix` file.
   - In the Explorer, right-click the `.vsix` file → **Install Extension VSIX**.
3. Reload instances of **VS Code** or **Cursor**.

## Quick start

1. Open **Database Tools** in the Activity Bar → **Add Datasource** and pick your DSN and database **type**. DSN is the datasource name in the ODBC Data Sources application.
2. Expand a datasource to see **Tables**, **Views**, and **Procedures**. Click a view or procedure to preview its definition; use **Select** on a table or view for a generated query.
3. Open a `.sql` file → run **Tasks: Execute SQL** from the editor toolbar button, or **Alt**+click that button for **Tasks: Execute SQL with Datasource**, or run either command from the Command Palette.

## Commands

You can assign **keybindings** to these commands in **Keyboard Shortcuts**.

| Command | Description |
| --- | --- |
| Add Datasource | Save a datasource: DSN name and database type. |
| Remove Datasource | Remove a saved datasource from the extension. |
| Tasks: Execute SQL | Run the active **SQL** editor’s selection (if any) or full document; show results in the webview. |
| Tasks: Execute SQL with Datasource | Pick a datasource, then run SQL like **Execute SQL** (active editor must be **SQL**). |
| Search: Datasource | Search tables, views, and procedures by name and open the chosen object. |
| File: New Scratch SQL File... | Open a new unsaved SQL document for scratch work. |

## Settings
Extension settings can be found under **Settings** → **Extensions** → **SQL Anywhere 17 Database Tools**.

## Building

```bash
yarn install
yarn run rebuild-odbc
yarn run vsce package
```
