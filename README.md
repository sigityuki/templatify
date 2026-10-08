# Templatify

**Templatify** is a flexible and lightweight Visual Studio Code extension designed to generate files and folder structures from custom templates. It streamlines your development workflow, ensures consistent naming conventions, and supports structured architectures like Clean Architecture across projects (such as Flutter, React, NestJS, and more).

---

## Features

- **Custom Template Directory (`.templates`)**: Easily create single-file templates or nested folder structures inside the `.templates` folder at your workspace root.
- **Flexible Naming Conventions (`templatify.yaml`)**: Automatically format names using `kebab-case`, `PascalCase`, `camelCase`, `snake_case`, or `Original` for filenames, classes, and properties.
- **Template Descriptions**: Add descriptions to your templates using a pipe separator (`|`) so they appear clearly in the Quick Pick menu.
- **Smart Placeholders**:
  - `${FILENAME}`: Resolves according to your filename naming rule.
  - `${CLASS}`: Resolves according to your class naming rule (typically `PascalCase`).
  - `${PROPERTY}`: Resolves according to your property naming rule (typically `camelCase`).
- **Empty Folder Support**: Instantly generate empty folder structures if needed.
- **Automatic File Extension**: Generated files automatically inherit the exact file extension of the template.

---

## Installation & Getting Started

### 1. Automatic Initialization
When first run in a workspace, Templatify automatically creates:
- A **`.templates/`** folder containing a default sample template.
- A **`templatify.yaml`** configuration file in your root directory.

### 2. Creating Your Own Templates
Create a new file or folder inside your `.templates` directory following this format:
```text
.templates/
 └── ${FILENAME}_repository.dart.template | Template for Repository Implementation
```
### 3. Generating Files or Folders
1. Right-click on any folder or explorer space in the VS Code sidebar.
2. Select **Templatify: Generate**.
3. Choose your desired template from the Quick Pick menu (complete with descriptions).
4. Enter your base name (e.g., `user profile`).
5. Your new file or folder will be generated instantly and opened in the editor!

---

## Configuration (`templatify.yaml`)

You can customize the naming rules for your project by editing the `templatify.yaml` file in your workspace root:

```yaml
# Templatify Configuration
# Available casing options: PascalCase, camelCase, snake_case, kebab-case, Original

naming:
  filename: kebab-case
  class: PascalCase
  property: camelCase
```
## Example Usage (Flutter / Dart)

Here is an example of a template file named `${FILENAME}_repository_impl.dart.template`:

```dart
import './src/features/auth/data/domain/repositories/${FILENAME}_repository.dart';

class ${CLASS}RepositoryImpl implements ${CLASS}Repository {
  const ${CLASS}RepositoryImpl();

  @override
  Future<void> getData() async {
    // TODO: implement getData
    throw UnimplementedError();
  }
}
```

If you generate this template using the base name `user profile` inside the `src/features/auth/data` folder, the resulting file `user-profile_repository_impl.dart` will look like this:

```dart
import './src/features/auth/data/domain/repositories/user-profile_repository.dart';

class UserProfileRepositoryImpl implements UserProfileRepository {
  const UserProfileRepositoryImpl();

  @override
  Future<void> getData() async {
    // TODO: implement getData
    throw UnimplementedError();
  }
}
```