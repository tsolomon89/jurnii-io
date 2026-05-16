# Coding Standards

- **Project Foundation**: The existing baseline code is located in `.agents/example/`. Follow the project's existing framework and file conventions as they evolve.
- **Dependencies**: Do not introduce new libraries or packages unless explicitly justified and approved by the user.
- **Components**: Prefer small, composable components over monolithic files.
- **Type Safety**: Preserve type safety. If TypeScript is used, strictly type all props and state.
- **Styling**: Keep styling consistent with the existing system unless the redesign explicitly replaces it.
- **Scope**: Do not rewrite unrelated code. Maintain the exact scope of the requested change.
