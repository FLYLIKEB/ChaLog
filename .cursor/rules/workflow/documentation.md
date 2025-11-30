## Documentation Style

### Mermaid Diagrams
- Use global theme configuration via `%%{init}%%` directive instead of individual style declarations
- Apply consistent theme to all diagrams for visual consistency
- Standard theme configuration:
  ```mermaid
  %%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
  ```
- For error states, add error colors:
  ```mermaid
  %%{init: {'theme':'base', 'themeVariables': { ..., 'errorBkgColor':'#fed7d7', 'errorTextColor':'#742a2a'}}}%%
  ```
- Do not use individual `style` declarations - let the theme handle styling automatically
- Keep diagram text concise and readable - avoid emojis in node labels for better compatibility
- Use descriptive subgraph and node names in Korean or English

### Markdown Files
- Use clear section headers (##, ###)
- Include code examples with proper syntax highlighting
- Reference related documentation files using relative paths: `docs/CATEGORY/FILENAME.md`
- Keep documentation up-to-date with code changes

