# Re-measure a speed-optimized Zephyr build

Use this procedure when a report recommends testing compiler optimization. The
evaluation runner has no optimization flag; configure the existing workspace.

1. Retain the baseline evidence in its original directory. Record the model hash,
   dataset, target, arena size, warm-up policy and capture settings so the next run
   changes only the compiler optimization choice.
2. Inspect `<workspace>/<project>/build/zephyr/.config` for the effective optimization
   choice. `CONFIG_DEBUG=y` alone does not identify that choice or prove a latency
   penalty. Preserve the original `<workspace>/<project>/prj.conf` outside the project.
3. In `prj.conf`, set `CONFIG_SPEED_OPTIMIZATIONS=y`. Remove any explicit competing
   optimization choice set to `y` (such as `CONFIG_DEBUG_OPTIMIZATIONS` or
   `CONFIG_SIZE_OPTIMIZATIONS`). Keep tracing and other settings unchanged.
4. Repeat the original `scripts/run_evaluation.py` invocation with the same inputs and
   measurement options, replacing `--workspace-parent` and `--name` with
   `--workspace <existing-workspace>`, and using a **new** `--evidence` directory.
   Omit `--stop-after` for a complete hardware rerun. This rebuilds, flashes and captures;
   keep the selected physical board connected. Do not recreate the workspace because
   that would replace the edited configuration.
5. Verify the new `build/zephyr/.config` contains `CONFIG_SPEED_OPTIMIZATIONS=y` and
   `manifest.json` records `build.speed_optimizations: true`, complete capture and
   the new ELF hash. If the setting did not take effect, inspect configuration
   overrides and build logs; do not label the result speed-optimized.
6. Compare measured total and per-layer latency against the baseline. Report a
   speedup only if measured. Test arena right-sizing in a separate run so its effects
   do not confound the optimization comparison; then restore the saved `prj.conf`
   if the experimental setting should not become the workspace default.

Zephyr documents `prj.conf` as an application Kconfig fragment in
[Application Development](https://docs.zephyrproject.org/latest/develop/application/index.html).
