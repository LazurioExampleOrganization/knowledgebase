import { ensureKnowledgebaseDataMount } from "./ensure-data-mount.mjs";
import { runAstroTask } from "./astro-runner.mjs";
import { resolveMainListener } from "../../../runtime-listener.mjs";

try {
  await ensureKnowledgebaseDataMount();
  process.exitCode = await runAstroTask(process.argv[2], {
    listener: resolveMainListener(),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = error instanceof RangeError ? 2 : 1;
}
