import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fixtureRoot = fileURLToPath(
	new URL("../fixtures", import.meta.url)
);

const tempRoot = fileURLToPath(new URL("../.tmp", import.meta.url));

export function isDebug(): boolean {
	return process.env.CFS_TEST_DEBUG === "1";
}

export function resolveFixturePath(...segments: string[]): string {
	return path.resolve(fixtureRoot, ...segments);
}

export function resolveTempPath(...segments: string[]): string {
	return path.resolve(tempRoot, ...segments);
}

export async function pathExists(
	targetPath: string
): Promise<boolean> {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

export async function ensureCleanTempPath(
	...segments: string[]
): Promise<string> {
	const tempPath = resolveTempPath(...segments);
	await fs.rm(tempPath, { recursive: true, force: true });
	return tempPath;
}

export async function cleanupTempRoot(): Promise<void> {
	if (isDebug()) {
		return;
	}

	await fs.rm(resolveTempPath(), { recursive: true, force: true });
}
