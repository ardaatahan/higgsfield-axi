import { dispatch, type Registry } from "./cli/router.js";
import { homeCommand, rootHelp } from "./commands/home.js";
import { modelsCommand } from "./commands/models.js";
import { imageCommand, videoCommand } from "./commands/generate.js";
import { cancelCommand, statusCommand, waitCommand } from "./commands/requests.js";

const registry: Registry = {
  tool: "higgsfield-axi",
  root: homeCommand,
  rootHelp,
  commands: {
    models: modelsCommand,
    image: imageCommand,
    video: videoCommand,
    status: statusCommand,
    wait: waitCommand,
    cancel: cancelCommand,
  },
  aliases: {},
};

const code = await dispatch(registry, process.argv.slice(2));
process.exit(code);
