import { PrismaClient, Role, Visibility } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleCode = {
  javascript: `// JavaScript example
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return { message: 'Welcome', timestamp: Date.now() };
}

greet('World');`,
  typescript: `// TypeScript example
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(res => res.json());
}

export { User, getUser };`,
  python: `# Python example
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`,
  go: `// Go example
package main

import "fmt"

func main() {
    messages := make(chan string)
    
    go func() {
        messages <- "Hello from goroutine!"
    }()
    
    msg := <-messages
    fmt.Println(msg)
}`,
  json: `{
  "name": "zj-00001-gist",
  "version": "1.0.0",
  "description": "Gist-like code sharing platform",
  "dependencies": {
    "vue": "^3.4.0",
    "nestjs": "^10.0.0"
  }
}`,
  markdown: `# Gist Platform

A modern code snippet sharing platform.

## Features

- **Multi-language support**: JavaScript, TypeScript, Python, Go, and more
- **Version history**: Track changes with diff views
- **Collaboration**: Fork, comment, and star gists
- **Privacy controls**: Public, unlisted, or private gists

## Quick Start

\`\`\`bash
docker-compose up
\`\`\`

> Note: Make sure Docker is installed and running.`,
  css: `/* CSS example */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #10b981;
  --text-color: #1f2937;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.button {
  background: var(--primary-color);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.button:hover {
  transform: translateY(-2px);
}`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gist Platform</title>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/gists">Gists</a>
      <a href="/login">Login</a>
    </nav>
  </header>
  <main>
    <h1>Welcome to Gist Platform</h1>
    <p>Share and discover code snippets</p>
  </main>
</body>
</html>`,
  bash: `#!/bin/bash

# Bash script example
set -e

echo "Starting deployment..."

# Build the project
npm run build

# Deploy to server
if [ -z "$SERVER" ]; then
  echo "Error: SERVER environment variable not set"
  exit 1
fi

rsync -avz dist/ user@$SERVER:/var/www/app/

echo "Deployment complete!"`,
  sql: `-- SQL example
CREATE TABLE gists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'public',
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gists_author ON gists(author_id);
CREATE INDEX idx_gists_visibility ON gists(visibility);
CREATE INDEX idx_gists_created_at ON gists(created_at DESC);`,
  rust: `// Rust example
use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<&str, i32> = HashMap::new();
    
    scores.insert("Alice", 10);
    scores.insert("Bob", 5);
    
    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
    
    match scores.get("Alice") {
        Some(score) => println!("Alice's score: {}", score),
        None => println!("Alice not found"),
    }
}`,
};

const gistData = [
  {
    title: 'JavaScript Utility Functions',
    description: 'A collection of useful JavaScript utility functions',
    visibility: Visibility.PUBLIC,
    tags: ['javascript', 'utility', 'helpers'],
    files: [{ filename: 'utils.js', language: 'javascript', content: sampleCode.javascript }],
  },
  {
    title: 'TypeScript API Client',
    description: 'Type-safe API client with full type inference',
    visibility: Visibility.PUBLIC,
    tags: ['typescript', 'api', 'http'],
    files: [{ filename: 'client.ts', language: 'typescript', content: sampleCode.typescript }],
  },
  {
    title: 'Python Fibonacci Generator',
    description: 'Efficient Fibonacci sequence generator with memoization',
    visibility: Visibility.PUBLIC,
    tags: ['python', 'algorithm', 'recursion'],
    files: [{ filename: 'fibonacci.py', language: 'python', content: sampleCode.python }],
  },
  {
    title: 'Go Concurrency Patterns',
    description: 'Examples of Go concurrency patterns using channels',
    visibility: Visibility.UNLISTED,
    tags: ['go', 'concurrency', 'goroutine'],
    files: [{ filename: 'concurrency.go', language: 'go', content: sampleCode.go }],
  },
  {
    title: 'Project Configuration',
    description: 'Configuration files for the gist project',
    visibility: Visibility.PUBLIC,
    tags: ['config', 'json', 'documentation'],
    files: [
      { filename: 'package.json', language: 'json', content: sampleCode.json },
      { filename: 'README.md', language: 'markdown', content: sampleCode.markdown },
    ],
  },
  {
    title: 'CSS Modern Layout',
    description: 'Modern CSS layout techniques with Flexbox and Grid',
    visibility: Visibility.PUBLIC,
    tags: ['css', 'layout', 'flexbox', 'grid'],
    files: [{ filename: 'styles.css', language: 'css', content: sampleCode.css }],
  },
  {
    title: 'HTML5 Starter Template',
    description: 'A minimal HTML5 starter template',
    visibility: Visibility.PUBLIC,
    tags: ['html', 'template', 'starter'],
    files: [{ filename: 'index.html', language: 'html', content: sampleCode.html }],
  },
  {
    title: 'Bash Deployment Script',
    description: 'Automated deployment script using rsync',
    visibility: Visibility.PRIVATE,
    tags: ['bash', 'deployment', 'automation'],
    files: [{ filename: 'deploy.sh', language: 'bash', content: sampleCode.bash }],
  },
  {
    title: 'Database Schema Design',
    description: 'SQL schema for the gist application',
    visibility: Visibility.PUBLIC,
    tags: ['sql', 'database', 'schema'],
    files: [{ filename: 'schema.sql', language: 'sql', content: sampleCode.sql }],
  },
  {
    title: 'Rust HashMap Usage',
    description: 'Examples of HashMap usage in Rust',
    visibility: Visibility.PUBLIC,
    tags: ['rust', 'hashmap', 'collections'],
    files: [{ filename: 'hashmap.rs', language: 'rust', content: sampleCode.rust }],
  },
];

async function main() {
  console.log('Seeding database...');

  const hashedAdminPassword = await bcrypt.hash('admin123456', 10);
  const hashedUserPassword = await bcrypt.hash('user123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedAdminPassword,
      displayName: 'Administrator',
      bio: 'Super admin account',
      role: Role.ADMIN,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      email: 'user1@example.com',
      username: 'user1',
      password: hashedUserPassword,
      displayName: 'User One',
      bio: 'Just a regular user',
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      username: 'user2',
      password: hashedUserPassword,
      displayName: 'User Two',
      bio: 'Code enthusiast',
      role: Role.USER,
    },
  });

  const users = [admin, user1, user2];

  for (let i = 0; i < gistData.length; i++) {
    const user = users[i % users.length];
    const data = gistData[i];

    const existingGist = await prisma.gist.findFirst({
      where: {
        AND: [{ title: data.title }, { authorId: user.id }],
      },
    });

    if (!existingGist) {
      await prisma.$transaction(async (tx) => {
        const gist = await tx.gist.create({
          data: {
            title: data.title,
            description: data.description,
            visibility: data.visibility,
            authorId: user.id,
            tags: {
              connectOrCreate: data.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          },
        });

        await tx.gistFile.createMany({
          data: data.files.map((file, index) => ({
            filename: file.filename,
            language: file.language,
            content: file.content,
            order: index,
            gistId: gist.id,
          })),
        });

        const revision = await tx.revision.create({
          data: {
            gistId: gist.id,
            message: 'Initial revision',
          },
        });

        await tx.gistFile.createMany({
          data: data.files.map((file, index) => ({
            filename: file.filename,
            language: file.language,
            content: file.content,
            order: index,
            gistId: gist.id,
            revisionId: revision.id,
          })),
        });
      });

      console.log(`Created gist: ${data.title} by ${user.username}`);
    }
  }

  console.log('Seeding completed!');
  console.log(`
Created accounts:
- admin@example.com / admin123456 (Super Admin)
- user1@example.com / user123456
- user2@example.com / user123456
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
