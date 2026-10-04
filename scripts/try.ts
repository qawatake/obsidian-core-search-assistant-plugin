// Open the plugin in a throw-away Obsidian to try it by hand.
//
// USAGE: pnpm try        # open the release PR tagpr opened (this checkout if there is none)
//        pnpm try <PR>   # check out pull request <PR> in a git worktree, build it there and open it
//                        # <PR>: 93, #93 or its URL (https://github.com/.../pull/93/changes etc.)
//        pnpm try .      # build this checkout and open it
//
// Obsidian starts on a copy of e2e-vault with its own user data dir
// (see launchObsidian), so it touches neither your everyday Obsidian nor the
// repository. Close every Obsidian window (or press Ctrl+C here) when done:
// Obsidian is stopped and the vault copy, the user data dir and the worktree
// are removed. Whatever a run that was killed left behind is removed by the
// next run.
//
// Requires .obsidian-unpacked: run scripts/setup-obsidian.sh once beforehand.
import { execFileSync } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ElectronApplication } from "@playwright/test";
import {
	closeObsidian,
	launchObsidian,
	settleVaultWindow,
} from "../tests/support/obsidian.ts";

const SESSION_PREFIX = "obsidian-try-";
const PID_FILE = "pid";

const root = process.cwd();
const prArg = process.argv[2];
let pr: string | undefined;
if (prArg === undefined) {
	pr = findReleasePullRequest();
	console.log(
		pr === undefined
			? "[try] no open release PR by tagpr, trying this checkout"
			: `[try] trying the release PR by tagpr (#${pr})`,
	);
} else if (prArg !== ".") {
	pr = parsePullRequest(prArg);
	if (pr === undefined) {
		console.error(
			`usage: pnpm try [<PR number> | <PR URL of this repository> | .] (got ${prArg})`,
		);
		process.exit(1);
	}
}
try {
	await fs.access(path.join(root, ".obsidian-unpacked", "main.js"));
} catch {
	console.error(
		".obsidian-unpacked not found: run scripts/setup-obsidian.sh first",
	);
	process.exit(1);
}

await removeStaleSessions();

const session = await fs.mkdtemp(path.join(os.tmpdir(), SESSION_PREFIX));
await fs.writeFile(path.join(session, PID_FILE), String(process.pid));
const worktree = pr === undefined ? undefined : path.join(session, "worktree");
let app: ElectronApplication | undefined;

let cleaned = false;
async function cleanup() {
	if (app) await closeObsidian(app);
	removeSession();
}
function removeSession() {
	if (cleaned) return;
	cleaned = true;
	if (worktree) {
		run("git", ["worktree", "remove", "--force", worktree], root, true);
	}
	fsSync.rmSync(session, { recursive: true, force: true });
	console.log(`[try] removed ${session}`);
}
// Playwright's Electron launcher handles SIGINT itself and calls process.exit
// once Obsidian is closed, which would cut an async cleanup short. So on a
// signal just exit, and clean up synchronously in the exit hook instead.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
	process.on(signal, () => {
		console.log(`\n[try] ${signal}, cleaning up`);
		process.exit(130);
	});
}
process.on("exit", () => {
	if (cleaned) return;
	try {
		app?.process().kill("SIGKILL");
	} catch {
		// Already disposed: Obsidian is gone.
	}
	removeSession();
});

try {
	let pluginSource = root;
	if (worktree) {
		run("git", ["fetch", "origin", `pull/${pr}/head`], root);
		run("git", ["worktree", "add", "--detach", worktree, "FETCH_HEAD"], root);
		run("pnpm", ["install", "--frozen-lockfile"], worktree);
		pluginSource = worktree;
	}
	run("pnpm", ["build"], pluginSource);

	app = await launchObsidian({ dir: session, pluginSource });
	const page = await app.firstWindow();
	await settleVaultWindow(app, page);
	// The keyboard would still talk to the terminal: Obsidian started from it is
	// not the active app, and no window has the OS focus once the Settings
	// window that trusting the vault opens is closed. (The tests do not notice:
	// Playwright sends keys into the page, not through the OS.)
	await app.evaluate(({ app, BrowserWindow }) => {
		app.focus({ steal: true });
		BrowserWindow.getAllWindows()[0]?.focus();
	});
	console.log(
		`[try] Obsidian is up (${pr === undefined ? "this checkout" : `PR #${pr}`}). Close all its windows to clean up.`,
	);
	await waitForAllWindowsClosed(app);
} finally {
	await cleanup();
}

/** The open release PR tagpr maintains (it labels it `tagpr`), if any. */
function findReleasePullRequest(): string | undefined {
	const number = execFileSync(
		"gh",
		[
			...["pr", "list", "--label", "tagpr", "--state", "open"],
			...["--json", "number", "--jq", ".[0].number"],
		],
		{ cwd: root, encoding: "utf8" },
	).trim();
	return number === "" ? undefined : number;
}

/**
 * The PR number from `93`, `#93` or a URL of a PR of the origin repository,
 * whatever follows the number (`/changes`, `/files`, `?w=1`, `#discussion_...`).
 * A URL of another repository is rejected: the PR is fetched from origin.
 */
function parsePullRequest(arg: string): string | undefined {
	const number = /^#?(\d+)$/.exec(arg);
	if (number) return number[1];

	let url: URL;
	try {
		url = new URL(/^https?:\/\//.test(arg) ? arg : `https://${arg}`);
	} catch {
		return undefined;
	}
	const [owner, repo, pull, n] = url.pathname.split("/").filter(Boolean);
	if (url.hostname !== "github.com" || pull !== "pull" || !/^\d+$/.test(n ?? ""))
		return undefined;

	const origin = execFileSync("git", ["remote", "get-url", "origin"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	const originRepo = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(origin);
	if (
		!originRepo ||
		`${owner}/${repo}`.toLowerCase() !==
			`${originRepo[1]}/${originRepo[2]}`.toLowerCase()
	) {
		console.error(`${arg} is not a pull request of origin (${origin})`);
		return undefined;
	}
	return n;
}

function run(cmd: string, args: string[], cwd: string, ignoreFailure = false) {
	console.log(`[try] ${cmd} ${args.join(" ")}`);
	try {
		execFileSync(cmd, args, { cwd, stdio: "inherit" });
	} catch (e) {
		if (!ignoreFailure) throw e;
	}
}

/**
 * On macOS an Electron app keeps running after its last window is closed, so
 * watch the windows instead of waiting for the process to exit.
 */
function waitForAllWindowsClosed(app: ElectronApplication): Promise<void> {
	return new Promise((resolve) => {
		const done = () => {
			clearInterval(timer);
			resolve();
		};
		const timer = setInterval(() => {
			if (app.windows().every((w) => w.isClosed())) done();
		}, 500);
		app.on("close", done);
	});
}

/** Remove sessions whose `pnpm try` is gone (killed, crashed) without cleaning up. */
async function removeStaleSessions() {
	const tmp = os.tmpdir();
	for (const name of await fs.readdir(tmp)) {
		if (!name.startsWith(SESSION_PREFIX)) continue;
		const dir = path.join(tmp, name);
		const pid = Number(
			await fs.readFile(path.join(dir, PID_FILE), "utf8").catch(() => ""),
		);
		if (pid > 0 && isAlive(pid)) continue;
		console.log(`[try] removing a stale session ${dir}`);
		await fs.rm(dir, { recursive: true, force: true });
	}
	// Forget worktrees whose directory went away with a stale session.
	run("git", ["worktree", "prune"], root, true);
}

function isAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}
