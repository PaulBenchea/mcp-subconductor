import fs from 'fs/promises';
import path from 'path';

async function copyAssets() {
  const assetsSrc = path.join(process.cwd(), 'src', 'assets');
  const assetsDist = path.join(process.cwd(), 'dist', 'assets');
  
  const workflowsSrc = path.join(process.cwd(), 'src', 'workflows');
  const workflowsDist = path.join(process.cwd(), 'dist', 'workflows');

  try {
    // Copy Assets
    await fs.mkdir(assetsDist, { recursive: true });
    const assetFiles = await fs.readdir(assetsSrc);

    for (const file of assetFiles) {
      const srcFile = path.join(assetsSrc, file);
      const distFile = path.join(assetsDist, file);
      await fs.copyFile(srcFile, distFile);
      console.log(`Copied ${file} to dist/assets`);
    }

    // Copy Workflows
    await fs.mkdir(workflowsDist, { recursive: true });
    const workflowFiles = await fs.readdir(workflowsSrc);

    for (const file of workflowFiles) {
      const srcFile = path.join(workflowsSrc, file);
      const distFile = path.join(workflowsDist, file);
      await fs.copyFile(srcFile, distFile);
      console.log(`Copied ${file} to dist/workflows`);
    }
  } catch (err) {
    console.error('Error copying assets:', err);
    process.exit(1);
  }
}

copyAssets();