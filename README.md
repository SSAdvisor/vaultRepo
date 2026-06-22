# VaultRepo

VaultRepo is a secure, flexible file repository controller inspired by Git. Unlike traditional version control systems, VaultRepo introduces granular visibility settings, allowing individual files to be designated as `Public` or `Private`. Private files are securely hidden from non-owners and are excluded from unauthorized cloning or copying operations.

## Features

- **Granular Privacy Controls**: Set visibility at the file level. Private files are strictly isolated via Row Level Security (RLS) on the backend.
- **Git-like Workflow**: Use familiar commands (`init`, `add`, `commit`, `status`, `log`, etc.) without the steep learning curve.
- **Cross-Platform Interfaces**: Seamlessly interact with VaultRepo through a CLI, Web Dashboard, and GUI.
- **Built on Supabase**: Secure, real-time backend powered by Supabase and PostgreSQL.
- **Built-in Authentication**: Easily manage access and add collaborators to your private repositories.

## Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase project

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone <your-repo-url>
   cd vaultRepo
   npm install
   ```

2. Configure Environment Variables:
   Copy the `.env.template` file to `.env` and fill in your Supabase credentials.
   ```bash
   cp .env.template .env
   ```

3. Build the CLI:
   ```bash
   npm run build:cli
   ```

## CLI Usage

The VaultRepo CLI (`vr`) supports standard version control operations with integrated privacy management:

### Authentication & Initialization
*   `vr login <email> <password>` - Authenticate your session.
*   `vr init <name> [--private]` - Initialize a new VaultRepo repository.
*   `vr clone <repo> [new-name]` - Clone an existing repository.

### File Operations
*   `vr add <filename> [--public|--private]` - Stage a file and define its visibility.
*   `vr rm <filename>` - Remove a file.
*   `vr privacy <filename> [--public|--private]` - Check or alter the visibility of a file.
*   `vr ls` - List all tracked files and their privacy status.

### Versioning
*   `vr status` - View staging status and tracked changes.
*   `vr commit -m "Message"` - Commit staged changes to the backend.
*   `vr log [filename]` - Review the commit history.
*   `vr show <filename> [--version N]` - Display the contents of a specific file version.

## Development & Testing

Run the test suite using Vitest:
```bash
npm test
```

Start the web dashboard locally:
```bash
npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
