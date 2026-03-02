import fs from 'fs/promises';
import path from 'path';

async function copyAssets() {
  const srcDir = path.join(process.cwd(), 'src', 'assets');
  const distDir = path.join(process.cwd(), 'dist', 'assets');

  try {
    await fs.mkdir(distDir, { recursive: true });
    const files = await fs.readdir(srcDir);

    for (const file of files) {
      const srcFile = path.join(srcDir, file);
      const distFile = path.join(distDir, file);
      await fs.copyFile(srcFile, distFile);
      console.log(`Copied ${file} to dist/assets`);
    }
  } catch (err) {
    console.error('Error copying assets:', err);
    process.exit(1);
  }
}

copyAssets();