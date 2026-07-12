import { readFile, writeFile } from 'node:fs/promises';

const configUrl = new URL('../data/hf-artifacts.config.json', import.meta.url);
const outputUrl = new URL('../data/hf-artifacts.json', import.meta.url);
const config = JSON.parse(await readFile(configUrl, 'utf8'));

let previous = { artifacts: [] };
try {
  previous = JSON.parse(await readFile(outputUrl, 'utf8'));
} catch {
  // The first refresh starts without a cached snapshot.
}

const previousById = new Map(previous.artifacts.map((artifact) => [artifact.id, artifact]));

async function fetchMetadata(artifact) {
  const resource = artifact.repositoryType === 'dataset' ? 'datasets' : 'models';
  const endpoint = `https://huggingface.co/api/${resource}/${artifact.repository}`;
  const response = await fetch(endpoint, {
    headers: { 'user-agent': 'akshaypn.github.io artifact snapshot' }
  });

  if (!response.ok) {
    throw new Error(`${artifact.repository}: Hugging Face returned ${response.status}`);
  }

  const metadata = await response.json();
  const licenseTag = metadata.tags?.find((tag) => tag.startsWith('license:'));
  const languageTags = metadata.tags?.filter((tag) => /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(tag)) ?? [];

  return {
    downloads: Number.isFinite(metadata.downloads) ? metadata.downloads : null,
    likes: Number.isFinite(metadata.likes) ? metadata.likes : null,
    lastModified: metadata.lastModified ?? null,
    license: metadata.cardData?.license ?? licenseTag?.slice(8) ?? null,
    pipelineTask: metadata.pipeline_tag ?? metadata.cardData?.pipeline_tag ?? null,
    languages: metadata.cardData?.language ?? languageTags,
    repositoryBytes: Number.isFinite(metadata.usedStorage) ? metadata.usedStorage : null
  };
}

let successfulRequests = 0;
const artifacts = await Promise.all(config.artifacts.map(async (artifact) => {
  try {
    const stats = await fetchMetadata(artifact);
    successfulRequests += 1;
    return { ...artifact, stats };
  } catch (error) {
    const cached = previousById.get(artifact.id)?.stats;
    if (!cached) throw error;
    console.warn(`${error.message}; retaining the previous snapshot.`);
    return { ...artifact, stats: cached };
  }
}));

if (successfulRequests === 0) {
  throw new Error('No Hugging Face metadata requests succeeded; snapshot not replaced.');
}

const snapshot = {
  updatedAt: new Date().toISOString(),
  source: 'https://huggingface.co/qvac',
  note: 'Downloads are Hugging Face monthly-download snapshots, not unique users.',
  artifacts
};

await writeFile(outputUrl, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Updated ${successfulRequests}/${artifacts.length} artifact records.`);
