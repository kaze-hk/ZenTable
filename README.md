# ZenTable - Open Source Database Management Tool

ZenTable is an open-source database management tool similar to TablePlus, built with Tauri, React, and TypeScript. It provides a modern, cross-platform interface for working with multiple types of databases.

## Supported Databases

- SQLite
- MongoDB
- PostgreSQL

## Features

- Connect to SQLite, MongoDB, and PostgreSQL databases
- Execute SQL queries and MongoDB operations
- View query results in a clean, tabular format
- Browse database structures (tables, collections, etc.)
- Dark/Light mode support

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Tauri CLI](https://tauri.app/v1/api/cli/)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zentable.git
cd zentable
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri dev
```

### Building

To build for production:

```bash
npm run tauri build
```

This will create binaries for your platform in the `src-tauri/target/release` directory.

## Usage

### Connecting to Databases

1. **SQLite**: Select a SQLite database file from your filesystem.

2. **MongoDB**: Connect using either a connection string or by providing server details:
   - Host (default: localhost)
   - Port (default: 27017)
   - Database (optional)
   - Username (optional)
   - Password (optional)

3. **PostgreSQL**: Connect using either a connection string or by providing server details:
   - Host (default: localhost)
   - Port (default: 5432)
   - Database (default: postgres)
   - Username (default: postgres)
   - Password

### Executing Queries

1. For **SQLite** and **PostgreSQL**, enter standard SQL queries in the query editor.

2. For **MongoDB**, use JSON format queries:
```json
{
  "db": "your_database",
  "collection": "your_collection",
  "operation": "find",
  "filter": { "field": "value" }
}
```

### Exploring Database Structure

Use the Explorer tab to browse the structure of your connected database. Click on tables or collections to generate queries automatically.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

## Credits

ZenTable is built with:
- [Tauri](https://tauri.app/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Mantine UI](https://mantine.dev/)