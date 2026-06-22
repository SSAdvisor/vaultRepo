import { Command } from 'commander';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as os from 'os';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const CONFIG_PATH = path.join(os.homedir(), '.vrconfig');
const VR_DIR = path.join(process.cwd(), '.vr');

function loadSession() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveSession(session: any) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(session, null, 2));
}

async function ensureAuthenticated() {
  const session = loadSession();
  if (!session) {
    console.error("You are not logged in. Run 'vr login <email> <password>' first.");
    process.exit(1);
  }
  const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
  if (error || !user) {
    console.error("Session expired or invalid. Please login again.");
    process.exit(1);
  }
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });
  return user;
}

function getRepoConfig() {
  if (!fs.existsSync(VR_DIR)) {
    console.error("Not a vr repository.");
    process.exit(1);
  }
  const configPath = path.join(VR_DIR, 'config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const program = new Command();

program
  .name('vr')
  .description('VaultRepo CLI - A file repository controller with privacy controls')
  .version('1.0.0');

program.command('login')
  .description('Login to VaultRepo')
  .argument('<email>', 'User email')
  .argument('<password>', 'User password')
  .action(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login failed:", error.message);
      process.exit(1);
    }
    saveSession(data.session);
    console.log(`Successfully logged in as ${data.user?.email}`);
  });

program.command('init')
  .description('Initialize a new repository')
  .argument('<name>', 'Repository name')
  .option('--private', 'Make the repository private')
  .action(async (name, options) => {
    const user = await ensureAuthenticated();
    
    if (fs.existsSync(VR_DIR)) {
      console.error("Repository already initialized in this directory.");
      process.exit(1);
    }

    const isPublic = !options.private;
    const { data, error } = await supabase.from('repositories').insert({
      name,
      owner_id: user.id,
      is_public: isPublic
    }).select().single();

    if (error) {
      console.error("Failed to create repository:", error.message);
      process.exit(1);
    }

    fs.mkdirSync(VR_DIR);
    fs.writeFileSync(path.join(VR_DIR, 'config.json'), JSON.stringify({ repoId: data.id, name: data.name }, null, 2));
    fs.writeFileSync(path.join(VR_DIR, 'index.json'), JSON.stringify([]));

    console.log(`Initialized empty VaultRepo repository in ${VR_DIR}`);
    console.log(`Repository ID: ${data.id}`);
  });

program.command('list')
  .description('List repositories. Use --mine for only your repos, --all for public repos')
  .option('--mine', 'Only your repos')
  .option('--all', 'All public repos')
  .action(async (options) => {
    const user = await ensureAuthenticated();
    let query = supabase.from('repositories').select('*');
    if (options.mine) {
      query = query.eq('owner_id', user.id);
    } else if (options.all) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to list repositories:", error.message);
      process.exit(1);
    }

    if (data.length === 0) {
      console.log("No repositories found.");
    } else {
      data.forEach(repo => {
        console.log(`${repo.name} [${repo.is_public ? 'Public' : 'Private'}]`);
      });
    }
  });

program.command('info')
  .description('Display repository details including privacy settings')
  .argument('<repo-name>', 'Repository name')
  .action(async (repoName) => {
    await ensureAuthenticated();
    const { data, error } = await supabase.from('repositories').select('*').eq('name', repoName).single();
    if (error) {
      console.error("Failed to fetch repository info:", error.message);
      process.exit(1);
    }
    console.log(`Name: ${data.name}`);
    console.log(`ID: ${data.id}`);
    console.log(`Visibility: ${data.is_public ? 'Public' : 'Private'}`);
    console.log(`Created: ${new Date(data.created_at).toLocaleString()}`);
  });

program.command('delete')
  .description('Delete a repository and all its files (irreversible)')
  .argument('<repo-name>', 'Repository name')
  .action(async (repoName) => {
    const user = await ensureAuthenticated();
    const { error } = await supabase.from('repositories').delete().eq('name', repoName).eq('owner_id', user.id);
    if (error) {
      console.error("Failed to delete repository:", error.message);
      process.exit(1);
    }
    console.log(`Deleted repository ${repoName}`);
  });

program.command('clone')
  .description('Clone a repository')
  .argument('<repo>', 'Repository name')
  .argument('[new-name]', 'Directory to clone into')
  .action(async (repo, newName) => {
    const user = await ensureAuthenticated();
    const targetDir = newName || repo;

    if (fs.existsSync(targetDir)) {
      console.error(`Directory ${targetDir} already exists.`);
      process.exit(1);
    }

    const { data: repoData, error: repoError } = await supabase.from('repositories').select('*').eq('name', repo).single();
    if (repoError || !repoData) {
      console.error("Failed to find repository:", repoError?.message);
      process.exit(1);
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const vrDir = path.join(targetDir, '.vr');
    fs.mkdirSync(vrDir);
    fs.writeFileSync(path.join(vrDir, 'config.json'), JSON.stringify({ repoId: repoData.id, name: repoData.name }, null, 2));
    fs.writeFileSync(path.join(vrDir, 'index.json'), JSON.stringify([]));

    const { data: files } = await supabase.from('files').select('*, file_versions(*)').eq('repository_id', repoData.id);
    
    if (files) {
      for (const file of files) {
        const latestVersion = file.file_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0];
        if (latestVersion && latestVersion.content) {
          const filePath = path.join(targetDir, file.path);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, latestVersion.content);
        }
      }
    }
    console.log(`Cloned repository ${repo} into ${targetDir}`);
  });

program.command('add')
  .description('Add a file to the staging area')
  .argument('<file>', 'File to add')
  .option('--private', 'Make the file private')
  .option('--public', 'Make the file public')
  .action(async (file, options) => {
    await ensureAuthenticated();
    const config = getRepoConfig();
    const indexPath = path.join(VR_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    
    if (!fs.existsSync(file)) {
      console.error(`fatal: pathspec '${file}' did not match any files`);
      process.exit(1);
    }

    const isPublic = options.public ? true : (options.private ? false : false);

    const existing = index.find((i: any) => i.path === file);
    if (existing) {
      existing.is_public = isPublic;
    } else {
      index.push({
        path: file,
        is_public: isPublic
      });
    }

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`Added ${file} to staging. Visibility: ${isPublic ? 'Public' : 'Private'}`);
  });

program.command('edit')
  .description('Edit a file and create a new version')
  .argument('<filename>', 'File to edit')
  .action(async (filename) => {
    console.log(`Use your preferred editor to edit ${filename}. Then use 'vr add' and 'vr commit' to create a new version.`);
  });

program.command('show')
  .description('Display file content')
  .argument('<filename>', 'File to show')
  .option('--version <N>', 'Specific version')
  .action(async (filename, options) => {
    await ensureAuthenticated();
    const config = getRepoConfig();

    const { data: file, error: fileError } = await supabase.from('files').select('id').eq('repository_id', config.repoId).eq('path', filename).single();
    if (fileError) {
      console.error("File not found in repository.");
      process.exit(1);
    }

    let query = supabase.from('file_versions').select('*').eq('file_id', file.id);
    if (options.version) {
      query = query.eq('version_number', parseInt(options.version));
    } else {
      query = query.order('version_number', { ascending: false }).limit(1);
    }

    const { data: version, error: versionError } = await query.single();
    if (versionError || !version) {
      console.error("Version not found.");
      process.exit(1);
    }

    console.log(version.content);
  });

program.command('history')
  .description('Show version history for a file')
  .argument('<filename>', 'File to show history for')
  .action(async (filename) => {
    await ensureAuthenticated();
    const config = getRepoConfig();

    const { data: file, error } = await supabase.from('files').select('id').eq('repository_id', config.repoId).eq('path', filename).single();
    if (error) {
      console.error("File not found in repository.");
      process.exit(1);
    }

    const { data: versions } = await supabase.from('file_versions').select('*').eq('file_id', file.id).order('version_number', { ascending: false });
    
    versions?.forEach(v => {
      console.log(`Version ${v.version_number} - ${new Date(v.created_at).toLocaleString()}`);
      console.log(`Message: ${v.message}\n`);
    });
  });

program.command('privacy')
  .description('View or change file visibility')
  .argument('<filename>', 'File to check or change')
  .option('--private', 'Make private')
  .option('--public', 'Make public')
  .action(async (filename, options) => {
    await ensureAuthenticated();
    const config = getRepoConfig();

    if (!options.private && !options.public) {
      const { data, error } = await supabase.from('files').select('is_public').eq('repository_id', config.repoId).eq('path', filename).single();
      if (error || !data) {
        console.error("File not found in repository.");
        process.exit(1);
      }
      console.log(`${filename} is currently ${data.is_public ? 'Public' : 'Private'}`);
      return;
    }

    const isPublic = options.public ? true : false;
    const { error } = await supabase.from('files').update({ is_public: isPublic }).eq('repository_id', config.repoId).eq('path', filename);

    if (error) {
      console.error("Failed to update privacy:", error.message);
    } else {
      console.log(`Updated ${filename} visibility to ${isPublic ? 'Public' : 'Private'}`);
    }
  });

program.command('rm')
  .description('Remove a file from the repository')
  .argument('<filename>', 'File to remove')
  .action(async (filename) => {
    await ensureAuthenticated();
    const config = getRepoConfig();

    const { error } = await supabase.from('files').delete().eq('repository_id', config.repoId).eq('path', filename);
    if (error) {
      console.error("Failed to remove file:", error.message);
    } else {
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
      }
      console.log(`Removed ${filename}`);
    }
  });

program.command('ls')
  .description('List all tracked files in the repository and their privacy status')
  .action(async () => {
    await ensureAuthenticated();
    const config = getRepoConfig();

    const { data: files, error } = await supabase.from('files').select('path, is_public').eq('repository_id', config.repoId).order('path');
    if (error) {
      console.error("Failed to fetch files:", error.message);
      process.exit(1);
    }
    
    if (!files || files.length === 0) {
      console.log("No files in repository.");
      return;
    }

    console.log("Files in repository:");
    files.forEach(f => {
      console.log(`  ${f.path} [${f.is_public ? 'Public' : 'Private'}]`);
    });
  });

program.command('status')
  .description('Show the working tree status')
  .action(async () => {
    const config = getRepoConfig();
    const indexPath = path.join(VR_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

    console.log("On branch main\n");
    if (index.length === 0) {
      console.log("nothing to commit, working tree clean");
    } else {
      console.log("Changes to be committed:");
      index.forEach((item: any) => {
        console.log(`  (staged) ${item.path} [${item.is_public ? 'Public' : 'Private'}]`);
      });
    }
  });

program.command('commit')
  .description('Commit staged changes')
  .requiredOption('-m, --message <msg>', 'Commit message')
  .action(async (options) => {
    const user = await ensureAuthenticated();
    const config = getRepoConfig();
    const indexPath = path.join(VR_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

    if (index.length === 0) {
      console.log("nothing to commit, working tree clean");
      return;
    }

    for (const item of index) {
      const content = fs.readFileSync(item.path, 'utf-8');
      const filename = path.basename(item.path);

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('id')
        .eq('repository_id', config.repoId)
        .eq('path', item.path)
        .maybeSingle();

      let fileId;

      if (!fileData) {
        const { data: newFile, error: createError } = await supabase
          .from('files')
          .insert({
            repository_id: config.repoId,
            path: item.path,
            filename: filename,
            is_public: item.is_public
          }).select().single();
        
        if (createError) {
          console.error(`Error creating file ${item.path}:`, createError.message);
          continue;
        }
        fileId = newFile.id;
      } else {
        fileId = fileData.id;
      }

      const { data: versions } = await supabase.from('file_versions').select('version_number').eq('file_id', fileId).order('version_number', { ascending: false }).limit(1);
      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      const { error: versionError } = await supabase
        .from('file_versions')
        .insert({
          file_id: fileId,
          content: content,
          size_bytes: Buffer.byteLength(content, 'utf8'),
          version_number: nextVersion,
          message: options.message,
          author_id: user.id
        });

      if (versionError) {
        console.error(`Error saving version for ${item.path}:`, versionError.message);
      } else {
        console.log(`Committed ${item.path}`);
      }
    }

    fs.writeFileSync(indexPath, JSON.stringify([]));
    console.log(`Commit complete: ${options.message}`);
  });

program.command('log')
  .description('Show commit history for the repo or a specific file')
  .argument('[filename]', 'Optional file to show history for')
  .action(async (filename) => {
    await ensureAuthenticated();
    const config = getRepoConfig();

    if (filename) {
      const { data: file, error } = await supabase.from('files').select('id').eq('repository_id', config.repoId).eq('path', filename).single();
      if (error) {
        console.error("File not found");
        return;
      }
      const { data: versions } = await supabase.from('file_versions').select('*, files(path)').eq('file_id', file.id).order('created_at', { ascending: false });
      versions?.forEach(v => {
        console.log(`commit ${v.id}\nAuthor: ${v.author_id}\nDate: ${new Date(v.created_at).toLocaleString()}\n\n    ${v.message}\n`);
      });
    } else {
      const { data: files } = await supabase.from('files').select('id, path').eq('repository_id', config.repoId);
      if (!files || files.length === 0) return;
      const fileIds = files.map(f => f.id);
      const { data: versions } = await supabase.from('file_versions').select('*, files(path)').in('file_id', fileIds).order('created_at', { ascending: false });
      versions?.forEach(v => {
        console.log(`commit ${v.id} (${v.files?.path})\nAuthor: ${v.author_id}\nDate: ${new Date(v.created_at).toLocaleString()}\n\n    ${v.message}\n`);
      });
    }
  });

program.command('diff')
  .description('Show differences between versions')
  .argument('<filename>', 'File to diff')
  .option('--version <N>', 'Version to compare working tree against')
  .action(async (filename, options) => {
    console.log(`Diff functionality for ${filename}. Comparing local changes against remote version ${options.version || 'latest'}.`);
    console.log(`(A full text diffing library would be integrated here to output + and - lines)`);
  });

program.command('push')
  .description('Push local changes to the remote repository')
  .action(async () => {
    console.log("VaultRepo automatically pushes changes on commit. Everything is up-to-date!");
  });

program.command('pull')
  .description('Pull latest changes from the remote repository')
  .action(async () => {
    await ensureAuthenticated();
    const config = getRepoConfig();
    console.log(`Pulling latest files for ${config.name}...`);
    
    const { data: files } = await supabase.from('files').select('*, file_versions(*)').eq('repository_id', config.repoId);
    if (files) {
      for (const file of files) {
        const latestVersion = file.file_versions?.sort((a: any, b: any) => b.version_number - a.version_number)[0];
        if (latestVersion && latestVersion.content) {
          const filePath = path.join(process.cwd(), file.path);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, latestVersion.content);
          console.log(`Updated ${file.path}`);
        }
      }
    }
    console.log("Pull complete.");
  });

const collab = program.command('collab').description('Manage collaborators');

collab.command('add')
  .description('Add a collaborator to a private repository')
  .argument('<email>', 'Collaborator email')
  .action(async (email) => {
    console.log(`Request to add collaborator ${email} received. Need user lookup endpoint to resolve ID.`);
  });

collab.command('remove')
  .description('Remove a collaborator from the repository')
  .argument('<email>', 'Collaborator email')
  .action(async (email) => {
    console.log(`Request to remove collaborator ${email} received.`);
  });

collab.command('list')
  .description('List all collaborators for the repository')
  .action(async () => {
    await ensureAuthenticated();
    const config = getRepoConfig();
    const { data, error } = await supabase.from('collaborators').select('*').eq('repository_id', config.repoId);
    if (error) {
      console.error("Failed to fetch collaborators:", error.message);
      return;
    }
    if (data.length === 0) {
      console.log("No collaborators.");
    } else {
      data.forEach(c => console.log(`User ID: ${c.user_id} (${c.permission})`));
    }
  });

program.parse(process.argv);
